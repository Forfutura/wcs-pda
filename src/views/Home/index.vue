<template>
  <div class='conTent-Nav'>
    <div class='home'>
      <van-button type='info' v-for='item in navButtons' :key='item.keyId' @click='jumprouter(item)'>
        <span :class='item.iconfd'></span>
        {{ item.navName }}
      </van-button>
    </div>
  </div>
</template>

<script>
export default {
  // eslint-disable-next-line vue/multi-word-component-names
  name: 'home',
  data () {
    return {
      navButtons: [
        {
          navName: '发送订单',
          keyId: '/placeOrder',
          iconfd: 'iconfont icon-chuku'
        },
        {
          navName: '库位管理',
          keyId: '/areaControl',
          iconfd: 'iconfont iconfont icon-navicon-pdd'
        },
        {
          navName: '任务列表',
          keyId: '/taskList',
          iconfd: 'iconfont icon-navicon-cgrkd'
        },
        {
          navName: '报警列表',
          keyId: '/alarmTask',
          iconfd: 'iconfont icon-navicon-cgrkd'
        },
        {
          navName: '卡板管理',
          keyId: '/pallet',
          iconfd: 'iconfont iconfont icon-navicon-pdd'
        }
      ]
    }
  },
  methods: {
    jumprouter (item) {
      this.$router.push(item.keyId)
    }
  }
}
</script>

<style lang='less' scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;

  button:first-child {
    margin: 0.6rem auto 0.16rem;
  }

  button {
    margin: 0.16rem auto;
    width: 50%;
    height: 0.5rem;
    font-size: 0.18rem;

    div {
      span {
        span {
          font-size: 0.24rem;
          padding: 0 0.06rem 0 0;
        }
      }
    }
  }
}
</style>
