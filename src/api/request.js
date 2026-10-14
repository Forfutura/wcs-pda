import axios from 'axios'
import store from '@/store'
import router from '@/router'
import { Dialog, Notify } from 'vant'

const runtimeBaseURL =
  (typeof window !== 'undefined' && window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE_URL) ||
  'http://192.168.2.111:8085/api'

const requests = axios.create({
  // 基础路径
  baseURL: runtimeBaseURL, // app: http://10.1.20.151:8088/api, 网页：/api
  // 超时120秒：CTU入库串行下发（最多6条），每条约3-5秒 + 2秒间隔，最长约42秒，留足余量
  timeout: 120000
})

// 请求拦截器
requests.interceptors.request.use((config) => {
  const token = store.state.user.token
  const tenantId = store.state.user.userInfo

  // 携带token和租户ID带给服务器
  if (token) {
    config.headers['User-Token'] = token
    // config.headers['X-Tenant-Id'] = tenantId
  }

  return config
}, (error) => {
  // 处理请求错误
  Notify({ type: 'danger', message: '请求发送失败' })
  return Promise.reject(error)
})

// 响应拦截器
requests.interceptors.response.use(
  (res) => {
    const { message } = res.data || {}

    // 处理Token失效情况
    if (message === 'Token失效，请重新登录!') {
      return Dialog.confirm({
        message: '用户过期，请重新登录！',
        showCancelButton: false
      }).then(() => {
        // 清空本地存储数据并跳转到登录页
        window.localStorage.clear()
        router.push({ path: '/login' })
      }).catch(() => {
        // 处理取消操作（如果需要）
      })
    }
    return res.data
  },
  (err) => {
    Notify({ type: 'danger', message: '服务器响应数据失败' })
    return Promise.reject(err)
  }
)

export default requests
