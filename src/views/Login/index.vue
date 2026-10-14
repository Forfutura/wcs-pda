<template>
  <div class="login-page">
    <van-form class="text">
      <van-icon name="user-circle-o" class="login-icon" />
      <van-field v-model="username" name="用户名" label="用户名" placeholder="用户名"
                 :rules="[{ required: true, message: '请填写用户名' }]"/>
      <van-field v-model="password" type="password" name="密码" label="密码" placeholder="密码"
                 :rules="[{ required: true, message: '请填写密码' }]"/>
      <div style="margin: 16px;">
        <van-button round block type="info" @click="onSubmit">登录</van-button>
      </div>
    </van-form>
  </div>
</template>
<script>
import { Login } from '@/api'
import { Notify } from 'vant'

export default {
  name: 'login',
  data () {
    return {
      username: '',
      password: '',
    }
  },
  components: {
    [Notify.Component.name]: Notify.Component,
  },
  methods: {
    async onSubmit () {
      const param = {}
      param.loginname = this.username
      param.password = this.password
      const userinfo = await Login(param)
      if (userinfo.result === 0) {
        Notify({
          type: 'success',
          message: '登录成功'
        })
        this.$store.dispatch('userLogin', userinfo.data)
        window.localStorage.setItem('Yaowei-loginname', this.username)
        this.$router.push('/home')
      } else {
        Notify({
          type: 'danger',
          message: userinfo.message
        })
      }
    },
  },
}
</script>
<style>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 0.2rem;
  background: #fff;
  box-sizing: border-box;
}

.text {
  width: 100%;
  padding: 0 0.2rem;
  box-sizing: border-box;
}

.login-icon {
  display: block;
  margin: 0 auto 0.3rem;
  font-size: 1rem;
  color: #1989fa;
  text-align: center;
}
</style>
