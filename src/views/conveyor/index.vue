<template>
  <div class='conveyor-page'>
    <!-- 出库（自动判断：三号位有料→出库，二号位有料→退料） -->
    <van-button
      class='conveyor-btn'
      color='#07c160'
      :loading='loading.outbound'
      loading-text='执行中...'
      @click='handleOutbound'
    >
      出库
    </van-button>

    <!-- 复位 -->
    <van-button
      class='conveyor-btn'
      color='#1989fa'
      :loading='loading.reset'
      loading-text='执行中...'
      @click='handleReset'
    >
      复位
    </van-button>

    <!-- 急停 / 解除急停 -->
    <van-button
      class='conveyor-btn'
      :color='isEstop ? "#646566" : "#ee0a24"'
      :loading='loading.estop'
      loading-text='执行中...'
      @click='handleEstop'
    >
      {{ isEstop ? '解除急停' : '急停' }}
    </van-button>
  </div>
</template>

<script>
import { Toast } from 'vant'
import {
  conveyorSmartOutbound,
  conveyorReset,
  conveyorEstop,
  conveyorEstopRelease
} from '@/api'

export default {
  name: 'ConveyorControl',
  data () {
    return {
      isEstop: false,
      loading: {
        outbound: false,
        reset: false,
        estop: false
      }
    }
  },
  methods: {
    /**
     * 出库按钮：自动判断料箱位置
     *   - 三号位（D143=1）有料箱 → 执行出库（D130=8）
     *   - 二号位（D142=1）有料箱 → 执行退料（D131=1 且 D132=1）
     *   - 两个位置均无料箱       → 提示用户
     */
    async handleOutbound () {
      this.loading.outbound = true
      try {
        const res = await conveyorSmartOutbound()
        if (res && res.result === 0) {
          Toast.success(res.message || '指令已发送')
        } else {
          Toast.fail(res ? res.message : '操作失败')
        }
      } catch (e) {
        Toast.fail('请求异常，请检查网络连接')
      } finally {
        this.loading.outbound = false
      }
    },

    /** 复位：写 D133=1 */
    async handleReset () {
      this.loading.reset = true
      try {
        const res = await conveyorReset()
        if (res && res.result === 0) {
          Toast.success(res.message || '复位指令已发送')
        } else {
          Toast.fail(res ? res.message : '复位失败')
        }
      } catch (e) {
        Toast.fail('复位请求异常')
      } finally {
        this.loading.reset = false
      }
    },

    /** 急停 / 解除急停切换 */
    async handleEstop () {
      this.loading.estop = true
      try {
        if (this.isEstop) {
          const res = await conveyorEstopRelease()
          if (res && res.result === 0) {
            this.isEstop = false
            Toast.success(res.message || '已解除急停')
          } else {
            Toast.fail(res ? res.message : '解除急停失败')
          }
        } else {
          const res = await conveyorEstop()
          if (res && res.result === 0) {
            this.isEstop = true
            Toast.success(res.message || '急停指令已发送')
          } else {
            Toast.fail(res ? res.message : '急停失败')
          }
        }
      } catch (e) {
        Toast.fail('急停请求异常')
      } finally {
        this.loading.estop = false
      }
    }
  }
}
</script>

<style lang='less' scoped>
.conveyor-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 0.6rem;

  .conveyor-btn {
    width: 50%;
    height: 0.5rem;
    font-size: 0.18rem;
    font-weight: bold;
    margin: 0.16rem auto;
    border-radius: 0.06rem;
  }
}
</style>
