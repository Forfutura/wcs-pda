import requests from './request'

// 登录  /sys/login
export const Login = (data) => requests({
  url: '/admin/login',
  method: 'post',
  data
})
// 退出登录  /sys/logout
export const Logout = (data) => requests({
  url: '/admin/logout',
  method: 'post',
  data
})

// 获取任务列表  /task/taskIns/instances
export const instances = (data) => requests({
  url: '/taskIns/instances',
  method: 'post',
  data
})
// 发起订单的接口    /task/new
export const orderNew = (data) => requests({
  url: '/order/new',
  method: 'post',
  data
})
// 工序/任务定义菜单（定义驱动：PDA 可选工序来自后端启用定义，orderCode=定义编码）
export const pdaTaskMenu = (data) => requests({
  url: '/taskDefinition/menu',
  method: 'post',
  data: data || {}
})
// RCS 任务链（PDA「任务类型」下拉）：数据来自 WCS 表 wcs_rcs_task_chain，
// 由 RCS agv_ds_task_chain_template 同步而来；返回 [{code,name,type,composition,text,value}]
// 后端返回全部启用的链（系统内置 + 自定义）；value 即下单时携带的 taskChainCode
export const rcsTaskChains = (data) => requests({
  url: '/rcs/taskChain/list',
  method: 'get',
  params: data || {}
})
// 烤房温度状态（终点为烤房位 KF<n> 时下发前校验/展示）
export const getFurnaceStatus = (locationCode) => requests({
  url: '/temperature/furnaceStatus?locationCode=' + locationCode,
  method: 'get'
})
// 终止(取消)动作
// 注意：服务端 AgvApi /order/cancel 只声明了 GET（web 后台 warehouseInfo.service.ts 亦用 get），
// 用 POST 会被 Spring 判 405 → GlobalExceptionHandler 兜底成 ERROR-999
export const canCel = (data) => requests({
  url: '/order/cancel?serialNo=' + data.serialNo,
  method: 'get'
})
// 直接完成任务
export const finishTask = (data) => requests({
  url: '/order/finishTask?serialNo=' + data.serialNo,
  method: 'post'
})
// 获取任务列表
export const recordPage = (data) => requests({
  url: '/alarm/record/page',
  method: 'post',
  data
})

/**
 *
 * 报警记录轮询接口；约定10秒查询一次
 *
 */
export const getAbnormal = (data) => requests({
  url: '/alarm/record/abnormal',
  method: 'post',
  data
})

// 获取库区  /warehouse/area/page/list
export const AreaInfo = (data) => requests({
  url: '/warehouseAreaInfo/list',
  method: 'post',
  data
})
// 获取库位  /warehouse/location/page/list
export const LocationInfo = (data) => requests({
  url: '/warehouseLocation/list',
  method: 'post',
  data
})

// 查询库位是否上锁
export const LocationIsLock = (data) => requests({
    url: '/warehouseLocation/lock?location=' + data,
    method: 'get',
})

export const getOne = (data) => requests({
  url: '/warehouse/location/getOne',
  method: 'post',
  data
})

// 按「搬运顺序」排好序的库位列表（顺序与 WCS 自动分配库位一致，按库区可配方向）
export const LocationOrderedList = (data) => requests({
  url: '/warehouse/location/orderedList',
  method: 'post',
  data
})

// 获取物料选项
export const MaterialOptions = (areaCode) => requests({
  url: '/material/get_options?areaCode=' + areaCode,
  method: 'get'
})

// 单个编辑库位状态 /warehouse/location/edit
export const updateLocationInfo = (param) => requests({
  url: param.url,
  method: 'post',
  data: param.data
})

// 批量编辑库位状态 /warehouseLocation/update/status
export const updateBins = (param) => requests({
  url: param.url,
  method: 'post',
  data: param.data
})

// 通过箱体码查询物料信息
export const selectProduction =(param) => requests({
  url: `/pallet/bind/selectProductCodeByBoxCode`,
  method: 'post',
  data: param
})

// 新建卡板绑定
export const binding =(param) => requests({
  url: `/pallet/bind/new`,
  method: 'post',
  data: param
})

// 查询订单库区库位
export const selectOrderLocation =(param) => requests({
  url: `/pallet/bind/list`,
  method: 'post',
  data: param
})

// 解除卡板绑定
export const deleteBinding =(param) => requests({
  url: `/pallet/bind/deleteByCode`,
  method: 'post',
  data: param
})

export const updateTaskEndLocation = (data) => requests({
  url: `/order/updateTaskEndLocation?serialNo=` + data.serialNo + `&locationCode=` + data.locationCode,
  method: 'get',
})

// ==================== 滚筒线控制接口 ====================

/** CTU入库：查询目的库区下的空闲库位数量，用于动态限制料箱编码最大输入数 */
export const ctuInAvailableCount = (areaCode) => requests({ url: `/order/ctu/in/available-count?areaCode=${areaCode}`, method: 'get' })

/** 智能出库：自动判断料箱位置，三号位有料执行出库，二号位有料执行退料 */
export const conveyorSmartOutbound = () => requests({ url: '/conveyor/smart-outbound', method: 'post' })

/** 出库：检测第3位置有料箱后写 D130=8（保留，供直接调用） */
export const conveyorOutbound = () => requests({ url: '/conveyor/outbound', method: 'post' })

/** 退料：检测第2位置有料箱后写 D131=1 且 D132=1（保留，供直接调用） */
export const conveyorReturn = () => requests({ url: '/conveyor/return-check', method: 'post' })

/** 复位：写 D133=1 */
export const conveyorReset = () => requests({ url: '/conveyor/reset', method: 'post' })

/** 急停：写 D134=1 */
export const conveyorEstop = () => requests({ url: '/conveyor/estop', method: 'post' })

/** 解除急停：写 D134=0 并触发复位 */
export const conveyorEstopRelease = () => requests({ url: '/conveyor/estop-release', method: 'post' })

/** 查询急停状态：读 D134 */
export const conveyorEstopStatus = () => requests({ url: '/conveyor/estop-status', method: 'get' })

/** CTU出库：根据产品编码查询料箱信息，获取库位编码和产品批号 */
export const boxQuery = (data) => requests({
  url: '/box/query',
  method: 'post',
  headers: { 'Content-Type': 'application/json' },
  data
})

