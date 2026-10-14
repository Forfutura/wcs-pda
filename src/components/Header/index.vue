<template>
  <header>
    <van-nav-bar :title="navName" @click-left="noClickLeft">
      <template #left v-if="navName !== '首页'">
        <van-icon name="arrow-left" size="16">返回</van-icon>
      </template>
      <template #right v-if="navName === '首页'">
        <!-- <van-icon name="friends" size="22"></van-icon> -->
        <van-popover v-model="showPopover" trigger="click" :actions="actions" @select="onSelect" placement="bottom-end">
          <template #reference>
            <van-button type="primary"><span :class="iconfd"></span></van-button>
          </template>
        </van-popover>
      </template>
    </van-nav-bar>
    <van-notice-bar
      v-if="navName === '首页' && noticeText !== '' && showNotice"
      left-icon="volume-o"
      scrollable
      mode="closeable"
      color="red"
      :text="noticeText"
      @close="noticeClose"
      speed='50'
    />
  </header>
</template>
<script>
import {getAbnormal} from '@/api'

export default {
  name: "Header",
  data() {
    return {
      navName: this.$route.meta.title,
      iconfd: "iconfont icon-gerenzhongxin",
      showPopover: false,
      actions: [{text: window.localStorage.getItem('Yaowei-loginname'), disabled: true}, {text: '退出登录'}],
      noticeText: '',
      noticeList: [],
      flag: null,
      showNotice: true,
      warning: null,
    }
  },
  mounted() {
    // this.getAbnormal()
    // this.mySetInterval()
  },
  methods: {
    noClickLeft() {
      if (this.$route.path !== '/home' && this.$route.path !== '/') {
        this.$router.go(-1)
      }
    },
    onSelect(action) {
      if (action.text === '退出登录') {
        this.$store.dispatch("userLogout")
        // 路由路径用小写 /login（与路由配置一致），并捕获导航错误
        this.$router.push('/login').catch(() => {})
      }
    },
    async getAbnormal() {
      const res = await getAbnormal()
      if (res.code === 0 && res.data.length > 0) {
        this.showNotice = true
        this.noticeText = ''
        res.data.map(item => {
          this.noticeList.push(item)
        })
        this.noticeList.map((item, index) => {
          this.noticeText += `报警${index + 1}: 车辆ID: ${item.agvId} 状态异常，异常原因: ${item.exception}。 `
        })
        if (this.warning === null) {
          this.warning = setInterval(() => {
            this.warningVoices()
          }, 5000)
        }
      } else {
        clearInterval(this.warning)
        this.warning = null
        this.noticeText = ''
        this.showNotice = false
      }
    },
    async warningVoices() {
      const audio = new Audio(require('@/assets/warning.mp3'));
      await audio.play().catch((e) => {
        console.error('播放失败', e)
      });
    },
    mySetInterval() {
      this.flag = setInterval(() => {
        this.getAbnormal()
      }, 10000);
    },
    noticeClose() {
      this.showNotice = false
      this.noticeText = ''
      this.noticeList = []
    }
  },
  watch: {
    $route(newName, oldName) {
      this.navName = newName.meta.title
    },
    deep: true,
    immediate: true,
  },
  beforeDestroy() {
    clearInterval(this.flag);
    clearInterval(this.warning);
  }
};
</script>
<style lang="less" scoped>
header {
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 1000;
  box-shadow: 0 0.06rem 0.08rem 0 rgb(0 0 0 / 0.04rem);
  background-color: skyblue;

  ::v-deep .van-nav-bar {
    background-color: #f6f5ec;

  }
}

::v-deep .van-nav-bar__title {
  font-size: 0.18rem !important;
  font-weight: 600;
}

::v-deep .van-nav-bar__right {
  span {
    font-size: 0.2rem;
  }

  span:hover {
    color: blue;
  }
}

::v-deep .van-button--primary {
  background-color: #f6f5ec;
  border: #f6f5ec;
  color: #000;
}
</style>
