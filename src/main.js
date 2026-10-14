import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from "@/store"
import 'reset-css'
import '@/styles/common.less';

Vue.config.productionTip = false

// 事件总线
Vue.prototype.$bus = new Vue
import "@/vantui"

// ================================================================
// 全局捕获 Vue Router 3 导航守卫产生的未处理 Promise 错误
// beforeEach 中调用 next('/login') 触发重定向时，vue-router 3 会产生
// NavigationRedirected / NavigationAborted 错误，这是正常业务行为，
// 通过 unhandledrejection 统一过滤掉，避免浏览器控制台出现红色报错。
// ================================================================
const VUE_ROUTER_ERR_NAMES = ['NavigationDuplicated', 'NavigationRedirected', 'NavigationAborted', 'NavigationCancelled']
window.addEventListener('unhandledrejection', function(event) {
  if (event.reason && VUE_ROUTER_ERR_NAMES.includes(event.reason.name)) {
    event.preventDefault()
  }
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const YaoweiToken = window.localStorage.getItem('Yaowei-Token')
  if (YaoweiToken) {
    if (to.path === '/' || to.path === '/login') {
      next({ path: '/home', replace: true })
    } else {
      next()
    }
  } else if (to.path === '/login' || to.path === '/') {
    next()
  } else {
    next({ path: '/login', replace: true })
  }
})

// PDA / file:// 下若 JS 报错会整页白屏，输出到控制台便于 chrome://inspect 调试
Vue.config.errorHandler = function (err, vm, info) {
  console.error('[Vue]', info, err)
}
window.onerror = function (message, source, lineno, colno, error) {
  console.error('[window.onerror]', message, source, lineno, colno, error)
}

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
