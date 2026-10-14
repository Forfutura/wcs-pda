window.__APP_CONFIG__ = window.__APP_CONFIG__ || {}

// 后端 API 地址
//   网页部署：用相对路径 '/api'，由 nginx 同源反代到 WCS 后端(127.0.0.1:8085)，
//             不跨域、不依赖 IP，换服务器也不用改前端
window.__APP_CONFIG__.API_BASE_URL = '/api'

//   APK 打包：页面以 file:// 加载，相对路径无效，须改成后端绝对地址后再 build：
// window.__APP_CONFIG__.API_BASE_URL = 'http://192.168.10.216:8085/api'
