import React, { useEffect, useState } from 'react';
import { Table, Button, message, Tag, Modal, Form, Input, Select, InputNumber, Space, Segmented } from 'antd';
import { ReloadOutlined, PlusOutlined, DeleteOutlined, AppstoreOutlined, UnorderedListOutlined, SearchOutlined } from '@ant-design/icons';
import { ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import PageHeader from '@/components/PageHeader';
import api from '@/utils/apis.ts';
import { useUserStore } from '@/utils/data.ts';
import { NATRule } from '@/types';

interface UserNATRule extends NATRule {
  hostName: string;
  vmUuid: string;
  rule_index: number;
  wan_ip: string; // 外网IP
}

const PortManage: React.FC<{ userMode?: boolean }> = ({ userMode = true }) => {
  const { user } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<UserNATRule[]>([]);
  const [filteredRules, setFilteredRules] = useState<UserNATRule[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [viewMode, setViewMode] = useState<'table' | 'card'>(() => window.innerWidth < 768 ? 'card' : 'table');
  
  // 搜索和筛选
  const [searchPort, setSearchPort] = useState('');
  const [hostFilter, setHostFilter] = useState('');
  const [vmFilter, setVmFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  
  // 主机和虚拟机列表，用于添加规则时的选择
  const [hosts, setHosts] = useState<string[]>([]);
  const [vms, setVms] = useState<{label: string, value: string}[]>([]);
  const [selectedHost, setSelectedHost] = useState<string>('');

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const apply = () => setViewMode(media.matches ? 'card' : 'table')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    fetchNATRules();
    loadHosts();
  }, []);

  // 筛选逻辑
  useEffect(() => {
    let filtered = [...rules];
    if (searchPort) {
      filtered = filtered.filter(r =>
        String(r.wan_port || '').includes(searchPort) ||
        String(r.lan_port || '').includes(searchPort)
      );
    }
    if (hostFilter) {
      filtered = filtered.filter(r => r.hostName === hostFilter);
    }
    if (vmFilter) {
      filtered = filtered.filter(r => r.vmUuid === vmFilter);
    }
    if (ownerFilter) {
      filtered = filtered.filter(r => (r as any).primaryOwner === ownerFilter);
    }
    setFilteredRules(filtered);
  }, [rules, searchPort, hostFilter, vmFilter, ownerFilter]);

  const loadHosts = async () => {
    try {
      const res = await api.getHosts();
      if (res.code === 200 && res.data) {
        setHosts(Object.keys(res.data));
      }
    } catch (e) {
      console.error('加载主机列表失败', e);
    }
  };

  const loadVMs = async (hostName: string) => {
    try {
      const res = await api.getVMs(hostName);
      if (res.code === 200 && res.data) {
        const vmList = Array.isArray(res.data) 
          ? res.data.map((vm: any) => ({ label: vm.config?.vm_uuid || vm.uuid, value: vm.config?.vm_uuid || vm.uuid }))
          : Object.values(res.data).map((vm: any) => ({ label: vm.config?.vm_uuid || vm.uuid, value: vm.config?.vm_uuid || vm.uuid }));
        setVms(vmList);
      }
    } catch (e) {
      console.error('加载虚拟机列表失败', e);
      setVms([]);
    }
  };

  const handleHostChange = (value: string) => {
    setSelectedHost(value);
    form.setFieldsValue({ vmUuid: undefined });
    loadVMs(value);
  };

  const fetchNATRules = async () => {
    setLoading(true);
    try {
      // 1. 获取所有主机
      const hostsRes = await api.getHosts();
      if (hostsRes.code !== 200 || !hostsRes.data) {
        throw new Error('获取主机列表失败');
      }
      const hostsData = hostsRes.data as any;
      const hostNames = Object.keys(hostsData);
      const currentUsername = user?.username || '';

      const allRules: UserNATRule[] = [];

      // 2. 遍历主机获取VMs
      for (const hostName of hostNames) {
        // 获取主机的外网IP
        const hostConfig = hostsData[hostName]?.config || {};
        const publicAddrs = hostConfig.public_addr || hostConfig.ipaddr_ddns || [];
        const wanIp = Array.isArray(publicAddrs) && publicAddrs.length > 0 ? publicAddrs[0] : (hostsData[hostName]?.addr || '-');

        try {
          const vmsRes = await api.getVMs(hostName);
          if (vmsRes.code === 200 && vmsRes.data) {
             const vms = Array.isArray(vmsRes.data) ? vmsRes.data : Object.values(vmsRes.data);
             
             // 3. 遍历VMs获取NAT规则
             await Promise.all(vms.map(async (vm: any) => {
                 const vmUuid = vm.config?.vm_uuid || vm.uuid;
                 const ownAll = vm.config?.own_all || {};
                 const ownerNames = Object.keys(ownAll);
                 const primaryOwner = ownerNames.length > 0 ? ownerNames[0] : '';

                 // 用户模式下只显示当前用户为主所有者的虚拟机
                 if (userMode && primaryOwner && primaryOwner !== currentUsername) return;
                 
                 try {
                    const natRes = await api.getNATRules(hostName, vmUuid);
                    if (natRes.code === 200 && natRes.data) {
                        natRes.data.forEach((r: NATRule, index: number) => {
                             allRules.push({
                                 ...r,
                                 hostName,
                                 vmUuid,
                                 rule_index: index,
                                 wan_ip: wanIp,
                                 primaryOwner
                             } as any);
                         });
                     }
                 } catch (e) {
                     // 忽略错误
                 }
             }));
          }
        } catch (e) {
          console.error(`获取主机 ${hostName} 数据失败`, e);
        }
      }

      setRules(allRules);
    } catch (error) {
      console.error('获取端口转发规则失败', error);
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleDelete = async (record: UserNATRule) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条端口转发规则吗？',
      mask: false,
      onOk: async () => {
        try {
          const res = await api.deleteNATRule(record.hostName, record.vmUuid, record.rule_index);
          if (res.code === 200) {
            message.success('删除成功');
            fetchNATRules();
          } else {
            message.error(res.msg || '删除失败');
          }
        } catch (e) {
          message.error('删除失败');
        }
      }
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      const data = {
        lan_port: values.vm_port,
        wan_port: values.host_port,
        nat_tips: values.description || '',
        lan_addr: ''
      };
      
      // @ts-expect-error - API接口类型定义与实际使用的数据结构不完全匹配
      const res = await api.addNATRule(values.hostName, values.vmUuid, data);
      if (res.code === 200) {
        message.success('添加成功');
        setModalVisible(false);
        fetchNATRules();
      } else {
        message.error(res.msg || '添加失败');
      }
    } catch (e) {
      message.error('添加失败');
    }
  };

  const columns = [
    {
      title: '主机',
      dataIndex: 'hostName',
      key: 'hostName',
      render: (text: string) => <Tag color="processing">{text}</Tag>,
    },
    {
      title: '虚拟机',
      dataIndex: 'vmUuid',
      key: 'vmUuid',
      render: (text: string) => <span className="art-table-strong">{text}</span>,
    },
    {
      title: '外网IP',
      dataIndex: 'wan_ip',
      key: 'wan_ip',
      render: (text: string) => <code className="art-table-code is-wan">{text || '-'}</code>,
    },
    {
      title: '外网端口',
      dataIndex: 'wan_port',
      key: 'wan_port',
      render: (text: number) => <span className="art-table-mono">{text || '-'}</span>,
    },
    {
      title: '内网IP',
      dataIndex: 'lan_addr',
      key: 'lan_addr',
      render: (text: string) => <code className="art-table-code is-lan">{text || '-'}</code>,
    },
    {
      title: '内网端口',
      dataIndex: 'lan_port',
      key: 'lan_port',
      render: (text: number) => <span className="art-table-mono">{text || '-'}</span>,
    },
    {
      title: '备注',
      dataIndex: 'nat_tips',
      key: 'nat_tips',
      render: (text: string) => <span className="art-table-muted">{text || '-'}</span>,
    },
    {
        title: '操作',
        key: 'action',
        render: (_: any, record: UserNATRule) => (
            <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />} 
                onClick={() => handleDelete(record)}
            >
                删除
            </Button>
        )
    }
  ];

  // 卡片视图渲染：与列表视图共用中性面板与语义化文本
  const renderCardView = (data: UserNATRule[]) => {
    if (data.length === 0) {
      return (
        <div className="art-table-empty">
          <ArrowsRightLeftIcon style={{ width: 34, height: 34 }} />
          <p>暂无端口转发规则</p>
        </div>
      );
    }
    return (
      <div className="nat-card-grid">
        {data.map((rule, index) => (
          <article
            key={`${rule.hostName}-${rule.vmUuid}-${rule.rule_index}-${index}`}
            className="art-panel nat-card"
          >
            <header className="nat-card-head">
              <div className="art-table-identity">
                <Tag color="processing" style={{ margin: 0 }}>{rule.hostName}</Tag>
                <span className="art-cell-sub" title={rule.vmUuid}>{rule.vmUuid}</span>
              </div>
              <Button aria-label="删除端口转发规则" danger size="small" type="text" icon={<DeleteOutlined />} onClick={() => handleDelete(rule)} />
            </header>

            <div className="nat-card-flow">
              <div className="art-subpanel">
                <div className="art-info-label">外网 (WAN)</div>
                <div className="art-table-mono">{rule.wan_ip || '-'}:{rule.wan_port || '-'}</div>
              </div>
              <span className="nat-card-arrow" aria-hidden="true">↓</span>
              <div className="art-subpanel">
                <div className="art-info-label">内网 (LAN)</div>
                <div className="art-table-mono">{rule.lan_addr || '-'}:{rule.lan_port || '-'}</div>
              </div>
            </div>

            <footer className="nat-card-foot">
              <span className="art-table-muted">{rule.nat_tips || '无备注'}</span>
            </footer>
          </article>
        ))}
      </div>
    );
  };

  return (
    <div className="art-stack">
      {/* 页面标题 */}
      <PageHeader
        icon={<ArrowsRightLeftIcon style={{ width: '24px', height: '24px' }} />}
        title="端口转发管理"
        subtitle={userMode ? '管理您的NAT端口转发规则' : '管理所有NAT端口转发规则'}
        actions={
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={fetchNATRules} loading={loading}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              添加规则
            </Button>
          </Space>
        }
      />

      <section className="art-list-toolbar" aria-label="端口转发筛选与视图切换">
        <div className="art-list-toolbar-filters">
          <Input
            className="art-list-search"
            prefix={<SearchOutlined />}
            placeholder="搜索端口、IP 或备注"
            value={searchPort}
            onChange={(e) => setSearchPort(e.target.value)}
            allowClear
          />
          <Select
            className="art-list-filter"
            placeholder="全部主机"
            value={hostFilter || undefined}
            onChange={(v) => { setHostFilter(v || ''); setVmFilter(''); }}
            allowClear
          >
            {hosts.map(h => <Select.Option key={h} value={h}>{h}</Select.Option>)}
          </Select>
          <Select
            className="art-list-filter"
            placeholder="全部虚拟机"
            value={vmFilter || undefined}
            onChange={(v) => setVmFilter(v || '')}
            allowClear
          >
            {[...new Set(rules.map(r => r.vmUuid))].map(vm => (
              <Select.Option key={vm} value={vm}>{vm}</Select.Option>
            ))}
          </Select>
          {!userMode && (
            <Select
              className="art-list-filter"
              placeholder="全部所有者"
              value={ownerFilter || undefined}
              onChange={(v) => setOwnerFilter(v || '')}
              allowClear
            >
              {[...new Set(rules.map(r => (r as any).primaryOwner).filter(Boolean))].map(owner => (
                <Select.Option key={owner} value={owner}>{owner}</Select.Option>
              ))}
            </Select>
          )}
        </div>
        <div className="art-list-toolbar-actions">
          <span className="art-list-result-count" aria-live="polite">
            显示 <strong>{loading ? '—' : filteredRules.length}</strong> / {rules.length} 条
          </span>
          <Segmented
            aria-label="端口转发显示方式"
            size="small"
            value={viewMode}
            onChange={(val) => setViewMode(val as 'table' | 'card')}
            options={[
              { value: 'table', icon: <UnorderedListOutlined />, label: '列表' },
              { value: 'card', icon: <AppstoreOutlined />, label: '卡片' },
            ]}
          />
        </div>
      </section>

      <section className="art-list-results" aria-label="端口转发清单">
        <header className="art-list-results-head">
          <div>
            <h2>{viewMode === 'table' ? '转发清单' : '转发概览'}</h2>
            <span>{userMode ? '当前账号的端口映射规则' : '全平台端口映射规则'}</span>
          </div>
        </header>

        {viewMode === 'table' ? (
          <div className="art-table-panel">
            <div className="art-panel-body is-flush">
              <Table
                dataSource={filteredRules}
                columns={columns}
                rowKey={(record) => `${record.hostName}-${record.vmUuid}-${record.rule_index}`}
                loading={loading}
                size="small"
                scroll={{ x: 'max-content' }}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 条`,
                }}
                locale={{
                  emptyText: (
                    <div className="art-table-empty">
                      <ArrowsRightLeftIcon style={{ width: 40, height: 40 }} />
                      <p>暂无端口转发规则</p>
                      <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        添加第一条规则
                      </Button>
                    </div>
                  ),
                }}
              />
            </div>
          </div>
        ) : (
          loading ? (
            <div className="art-loading">正在加载端口转发规则…</div>
          ) : renderCardView(filteredRules)
        )}
      </section>

      <Modal
        title="添加端口转发规则"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="hostName" label="选择主机" rules={[{ required: true }]}>
            <Select onChange={handleHostChange} placeholder="请选择主机">
              {hosts.map(h => <Select.Option key={h} value={h}>{h}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="vmUuid" label="选择虚拟机" rules={[{ required: true }]}>
            <Select placeholder="请选择虚拟机" disabled={!selectedHost}>
               {vms.map(v => <Select.Option key={v.value} value={v.value}>{v.label}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="host_port" label="公网端口 (外部)" rules={[{ required: true }]}>
            <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="例如：8080" />
          </Form.Item>
          <Form.Item name="vm_port" label="虚拟机端口 (内部)" rules={[{ required: true }]}>
            <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="例如：80" />
          </Form.Item>
          <Form.Item name="description" label="备注">
            <Input placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PortManage;
