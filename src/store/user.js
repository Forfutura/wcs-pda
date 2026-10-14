// 登录与注册的模块
const state = {
  token: localStorage.getItem('Yaowei-Token'),
  userInfo: localStorage.getItem('Yaowei-userInfo')
}
const mutations = {
  USERLOGIN (state, data) {
    window.localStorage.setItem('Yaowei-Token', data.token)
    window.localStorage.setItem('Yaowei-userInfo', data.tenantId)
    state.token = localStorage.getItem('Yaowei-Token')
    state.userInfo = localStorage.getItem('Yaowei-userInfo')
  },
  // 清除本地数据
  CLEAR (state) {
    // 帮仓库中先关用户信息清空
    state.token = ''
    // 本地存储数据清空
    window.localStorage.removeItem('Yaowei-Token')
    window.localStorage.removeItem('Yaowei-loginname')
    window.localStorage.removeItem('Yaowei-userInfo')
  }
}
const actions = {
  // 登录业务
  userLogin ({ commit }, data) {
    commit('USERLOGIN', data)
  },
  // 退出登录
  userLogout ({ commit }) {
    commit('CLEAR')
  }
}
const getters = {}
export default {
  state,
  mutations,
  actions,
  getters
}
