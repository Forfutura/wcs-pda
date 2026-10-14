import Vue from 'vue'
import VueRouter from 'vue-router'

// 所有路由全部同步 import，彻底消除异步 chunk
// HBuilder WebView 用 file:// 加载时，异步 chunk 会因跨域失败导致白屏
// @zxing/library 已在 placeOrder/index.vue 内部做了懒加载（调用摄像头时才引入），
// 此处同步 import 组件文件本身不会把 zxing 打进首包
import Home from '@/views/Home'
import Login from '@/views/Login'
import PlaceOrder from '@/views/placeOrder'
import OrderTask from '@/views/orderTask'
import Binding from '@/views/binding'
import Pallet from '@/views/pallet'
import AreaControl from '@/views/binControl'
import BinControl from '@/views/binControl/binControl'
import BinOccupiedDetail from '@/views/binControl/binOccupiedDetail'
import Conveyor from '@/views/conveyor'
import TaskList from '@/views/placeOrder/TaskList'
import AlarmTask from '@/views/placeOrder/alarmTask'
import EnterBox from '@/views/enterBox'
import EnterBoxDetail from '@/views/enterBox/enterBox'
import GoBox from '@/views/enterBox/goBox'

Vue.use(VueRouter)

// ================================================================
// Vue Router 3 补丁：修复 next('/path') 重定向产生的控制台红色报错
// vue-router 3.x 中守卫触发重定向/中止时会产生未捕获的 Promise 错误，
// 统一在 push/replace 原型上 catch 掉所有 vue-router 内部导航错误。
// ================================================================
const VUE_ROUTER_ERROR_TYPES = ['NavigationDuplicated', 'NavigationRedirected', 'NavigationAborted', 'NavigationCancelled']
const originalPush = VueRouter.prototype.push
VueRouter.prototype.push = function push(location) {
  return originalPush.call(this, location).catch(err => {
    if (err && VUE_ROUTER_ERROR_TYPES.includes(err.name)) return
    return Promise.reject(err)
  })
}
const originalReplace = VueRouter.prototype.replace
VueRouter.prototype.replace = function replace(location) {
  return originalReplace.call(this, location).catch(err => {
    if (err && VUE_ROUTER_ERROR_TYPES.includes(err.name)) return
    return Promise.reject(err)
  })
}

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/home',
    name: 'home',
    component: Home,
    meta: {
      title: '首页',
      headerShow: true
    }
  },
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: {
      title: '个人中心',
      headerShow: false
    }
  },
  {
    path: '/placeOrder',
    name: 'placeOrder',
    component: PlaceOrder,
    meta: {
      title: '发送订单',
      headerShow: true
    }
  },
  {
    path: '/orderTask',
    name: 'orderTask',
    component: OrderTask,
    meta: {
      title: '订单任务',
      headerShow: true
    }
  },
  {
    path: '/binding',
    name: 'binding',
    component: Binding,
    meta: {
      title: '绑定库位',
      headerShow: true
    }
  },
  {
    path: '/pallet',
    name: 'pallet',
    component: Pallet,
    meta: {
      title: '卡板管理',
      headerShow: true
    }
  },
  // 人工出入库
  {
    path: '/artificial',
    name: 'artificial',
    component: EnterBox,
    meta: {
      title: '人工出入库',
      headerShow: true
    }
  },
  {
    path: '/artificial/enterBox',
    name: 'enterBox',
    component: EnterBoxDetail,
    meta: {
      title: '人工出入库➡人工入库',
      headerShow: true
    }
  },
  {
    path: '/artificial/goBox',
    name: 'goBox',
    component: GoBox,
    meta: {
      title: '人工出入库➡人工出库',
      headerShow: true
    }
  },
  //取消任务
  {
    path: '/taskList',
    name: 'TaskList',
    component: TaskList,
    meta: {
      title: '任务列表',
      headerShow: true
    }
  },
  {
    path: '/alarmTask',
    name: 'alarmTask',
    component: AlarmTask,
    meta: {
      title: '报警列表',
      headerShow: true
    }
  },
  // 库位管理
  {
    path: '/areaControl',
    name: 'areaControl',
    component: AreaControl,
    meta: {
      title: '所在库区',
      headerShow: true
    }
  },
  {
    path: '/binControl:binDetails',
    name: 'binControl',
    component: BinControl,
    meta: {
      title: '库位管理',
      headerShow: true
    }
  },
  {
    path: '/binOccupiedDetail',
    name: 'binOccupiedDetail',
    component: BinOccupiedDetail,
    meta: {
      title: '占用库位详情',
      headerShow: true
    }
  },
  // 滚筒控制
  {
    path: '/conveyor',
    name: 'conveyor',
    component: Conveyor,
    meta: {
      title: '滚筒控制',
      headerShow: true
    }
  },
]

const router = new VueRouter({
  mode: 'hash',
  routes
})

// 懒加载 chunk 在 file:// 下失败时便于排查（PDA 白屏）
router.onError((err) => {
  console.error('[router]', err)
})

export default router
