<template>
  <van-pull-refresh v-model="isLoading" @refresh="onRefresh" style="min-height: 300px;">
    <div class="receiptWarehousing">
      <van-divider :style="{ color: '#1989fa', borderColor: '#1989fa', padding: '0 16px' }"> 报警列表</van-divider>
      <div class="taskList" v-for="item in historyList" :key="item.id">
        <div>
          <p v-if="item.exceptionType !== null && item.exceptionType === 0">任务单号：{{ item.orderId }}</p>
          <p v-if="item.exceptionType !== null && item.exceptionType !== 0">任务单号：非任务异常</p>
        </div>
        <div>
          <p>车辆ID：{{ item.agvId }}</p>
        </div>
        <div v-if="item.exceptionType !== null && item.exceptionType === 0">
          <p>执行仓库：{{ item.warehouse }}</p>
        </div>
        <div v-if="item.exceptionType !== null && item.exceptionType === 0">
          <p style="font-size: 14px;">起始:{{ item.fromLocation }} ➡ 目的:{{ item.toLocation }}</p>
        </div>
        <div>
          <p>上报时间：{{ item.reportTime }}</p>
        </div>
        <div>
          <p>{{ item.exception }}</p>
        </div>
      </div>
    </div>
  </van-pull-refresh>
</template>
<script>
import { recordPage } from '@/api'
import { Dialog, Toast } from 'vant'

export default {
  name: 'alarmTask',
  data () {
    return {
      historyList: [],
      isLoading: false
    }
  },
  mounted () {
    this.GetTaskList()
  },
  methods: {
    async onRefresh () {
      this.historyList = []
      const param = {
        pageNo: 1,
        pageSize: 100,
      }
      const res = await recordPage(param)
      if (res.code == 0) {
        if (res.data.totalCount != 0) {
          Toast('刷新成功')
          this.historyList = res.data.list
        } else {
          Toast('暂无数据')
        }
        this.isLoading = false
      } else {
        Toast(res.message)
        this.isLoading = false
      }
    },
    async GetTaskList () {
      this.historyList = []
      const param = {
        pageNo: 1,
        pageSize: 100,
      }
      const res = await recordPage(param)
      if (res.code == 0) {
        if (res.data.totalCount != 0) {
          this.historyList = res.data.list
        } else {
          Toast('暂无数据')
        }
      } else {
        Toast(res.message)
      }
    },
  }
}
</script>
<style lang="less" scoped>
::v-deep .van-divider {
  margin: 0.03rem 0;
}

.taskList {
  width: 92%;
  margin: 0 3.5%;
  padding: 2% 0.5%;
  border: 1px solid red;
  margin-bottom: 0.08rem;
  border-radius: 8px;

  div {
    margin: 0.04rem;
    font-size: 0.14rem;
    display: flex;

    .two-thirds {
      width: 60%;
    }

    p {
      margin: 0 1%;
      height: 0.26rem;
      width: 100%;
      background: #f7f8fa;
      line-height: 0.26rem;
      text-indent: 0.1rem;

      button {
        width: 100%;
        height: 100%;
        margin: 0 0 0 -0.1rem;
        padding: 0.04rem 0 0 0;
      }
    }
  }
}

::v-deep .van-button__content,
.van-button__text {
  height: 0.26rem !important;
  line-height: 0.18rem !important;
  margin: 0 !important;
  padding: 0 !important;
}
</style>
