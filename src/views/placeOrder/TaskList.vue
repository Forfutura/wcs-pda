<template>
  <van-pull-refresh v-model="isLoading" @refresh="onRefresh" style="min-height: 300px;">
    <div class="receiptWarehousing">
      <van-divider :style="{ color: '#1989fa', borderColor: '#1989fa', padding: '0 16px' }">
        任务列表
      </van-divider>
      <div class="taskList" v-for="(item , index) in historyList" :key="index">
        <!--        <p>{{index}} {{item}}</p>-->
        <div>
          <p>{{ item.code }}</p>
        </div>
        <div><p>任务编号: {{ item.serialNo }}</p></div>
        <div>
          <p>{{ item.taskName }}</p>
          <!-- 已完成：蓝色 -->
          <p class="two-thirds" style="color: #1989fa;" v-if="item.status === 10">{{ item.statusName }}</p>
          <!-- 已取消：灰色 -->
          <p class="two-thirds" style="color: #969799;" v-else-if="item.status === 9">{{ item.statusName }}</p>
          <!-- 失败：红色 -->
          <p class="two-thirds" style="color: #ee0a24;" v-else-if="item.status === 11 || item.status === 12">{{ item.statusName }}</p>
          <!-- 执行中/队列/创建：绿色 -->
          <p class="two-thirds" style="color: #07c160;" v-else>{{ item.statusName }}</p>
        </div>
        <div>
          <p style="font-size: 14px;">起始:{{ item.startLocationCode || '-' }} ➡ 目的:{{ item.endLocationCode || '-' }}</p>
        </div>
<!--        <div>-->
<!--          <p>{{ item.attribute5 ? '车辆Id:' + item.attribute5 : '未分配车辆' }}</p>-->
<!--          &lt;!&ndash; <p>-->
<!--            <span v-if="item.status != 9 && item.status != 10 && item.status != 4">{{ item.description }}</span>-->
<!--          </p> &ndash;&gt;-->
<!--        </div>-->
        <div>
          <p>{{ item.startTime || '开始时间' }}</p>
          <p>{{ item.endTime || '结束时间' }}</p>
        </div>
        <div class="butShow" v-if="item.status !== 9 && item.status !== 10 && item.status !== 11 && item.status !== 12">
          <van-button type="danger" block @click="stopTask(item.serialNo)" size="small">取消</van-button>
        </div>
      </div>
    </div>
    <van-dialog
      v-model="endLocationDialogShow"
      title="修改目的库位"
      show-cancel-button
      :before-close="handleEndLocationDialogClose"
      :confirm-button-text="endLocationSubmitting ? '提交中...' : '确定'"
    >
      <van-field
        v-model="endLocationValue"
        label="目的库位"
        placeholder="请扫描目的库位"
        clearable
      />
    </van-dialog>
  </van-pull-refresh>
</template>
<script>
import { canCel, finishTask, instances, updateTaskEndLocation } from '@/api'
import dayjs from 'dayjs'
import { Dialog, Toast } from 'vant'

export default {
  name: 'TaskList',
  data () {
    return {
      TableTime: [
        dayjs().add(-1, 'days'),
        dayjs()
      ],
      historyList: [],
      isLoading: false,
      endLocationDialogShow: false,
      endLocationSerialNo: '',
      endLocationValue: '',
      endLocationSubmitting: false
    }
  },
  mounted () {
    this.GetTaskList()
  },
  methods: {
    async onRefresh () {
      await this.GetTaskList()
      this.isLoading = false
    },
    async GetTaskList () {
      this.historyList = []
      const param = {
        pageNo: 1,
        pageSize: 1000000,
        startTime: this.TableTime[0].format('YYYY-MM-DD HH:mm:ss'),
        endTime: this.TableTime[1].format('YYYY-MM-DD HH:mm:ss')
      }
      const res = await instances(param)
      if (res.result === 0) {
        if (res.data.length > 0) {
          this.historyList = res.data
          Toast('刷新成功')
        } else {
          Toast('暂无数据')
        }
      } else {
        Toast(res.message)
      }
    },
    // 取消任务
    async stopTask (serialNo) {
      Dialog.confirm({
        // title: '标题',
        message: '确认终止该任务'
      }).then(async () => {
        if (serialNo) {
          const res = await canCel({ serialNo })
          if (res.result === 0) {
            Dialog.confirm({
              // title: '标题',
              message: res.message,
              showCancelButton: false
            }).then(() => {
              this.GetTaskList()
            })
          } else {
            Dialog.confirm({
              // title: '标题',
              message: res.message,
              showCancelButton: false
            }).then(() => {
            })
          }
        } else {
          Toast('请求参数缺失')
        }
      }).catch(() => {
      })
    },
    // 完成任务
    async finishTask (serialNo) {
      Dialog.confirm({
        // title: '标题',
        message: '确认完成该任务'
      }).then(async () => {
        if (serialNo) {
          const res = await finishTask({ serialNo })
          if (res.result === 0) {
            Dialog.confirm({
              // title: '标题',
              message: res.message,
              showCancelButton: false
            }).then(() => {
              this.GetTaskList()
            })
          } else {
            Dialog.confirm({
              // title: '标题',
              message: res.message,
              showCancelButton: false
            }).then(() => {
            })
          }
        } else {
          Toast('请求参数缺失')
        }
      }).catch(() => {
      })
    },
    // 修改目的库位
    updateEndLocation (serialNo) {
      if (!serialNo) {
        Toast('请求参数缺失')
        return
      }
      this.endLocationSerialNo = serialNo
      this.endLocationValue = ''
      this.endLocationDialogShow = true
    },
    async handleEndLocationDialogClose (action, done) {
      if (this.endLocationSubmitting) {
        done(false)
        return
      }
      if (action !== 'confirm') {
        done()
        return
      }

      const endLocation = (this.endLocationValue || '').trim()
      if (!endLocation) {
        Toast('请扫描目的库位')
        done(false)
        return
      }

      this.endLocationSubmitting = true
      try {
        const res = await updateTaskEndLocation({
          serialNo: this.endLocationSerialNo,
          locationCode: endLocation
        })
        Toast(res && res.message ? res.message : '操作完成')
        if (res && res.result === 0) {
          this.GetTaskList()
          done()
        } else {
          done(false)
        }
      } catch (e) {
        Toast('修改失败')
        done(false)
      } finally {
        this.endLocationSubmitting = false
      }
    }
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
  border: 1px solid #000;
  margin-bottom: 0.08rem;

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

.taskList {
  .butShow {
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
  }

  .butShow-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .butShow-bottom {
    display: flex;
    margin-top: 0.04rem;
    padding: 0 1%;
  }

  .butShow-bottom ::v-deep .van-button {
    height: 0.26rem;
    line-height: 0.26rem;
    padding: 0;
  }

  .butShow-bottom ::v-deep .van-button__content {
    height: 0.26rem;
    line-height: 0.26rem;
  }

  .butShow-top p {
    width: 48%;
    flex: 0 0 48%;
    background: #fff;
    text-indent: 0;
  }

  .butShow-top p button {
    margin: 0 !important;
    padding: 0 !important;
    height: 0.26rem;
  }

  .butShow ::v-deep .van-button__content {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

::v-deep .van-button__content,
.van-button__text {
  height: 0.26rem !important;
  line-height: 0.26rem !important;
  margin: 0 !important;
  padding: 0 !important;
}
</style>
