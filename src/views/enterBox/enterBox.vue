<template>
  <div class="receiptWarehousing">
    <div v-show="!loadingShow">
      <van-divider :style="{ color: '#1989fa', borderColor: '#1989fa', padding: '0 16px' }">
        入库流程： 扫描库位 ➡ 扫描物料 ➡ 确认入库
      </van-divider>
      <van-divider :style="{ color: '#1989fa', borderColor: '#1989fa', padding: '0 16px' }">
        扫描库位
      </van-divider>
      <div class="taskList">
        <div>
          <p class="Nameinfo">库位：</p>
          <p>
            <van-search v-model="binCode" placeholder="请扫描库位" class="sesrchSty"></van-search>
          </p>
          <van-icon name="scan" class="scan" @click="openScan('binCode')"/>
        </div>
      </div>
      <div class="butShow">
        <van-button type="info" @click="jumprouter" :disabled="butShowA">
          确认入库
        </van-button>
      </div>
    </div>
    <div class="page bgc-f4f4f4" v-show="loadingShow">
      <div class="video-show"/>
      <video id="video" ref="video" class="video vjs-fluid" autoplay/>
    </div>
  </div>
</template>
<script>
import {getOne, updateLocationInfo} from '@/api'
import {Dialog} from 'vant'
import {BrowserMultiFormatReader} from '@zxing/library'

export default {
  name: 'enterBox',
  data() {
    return {
      butShowA: true,
      binCode: '',
      binInfo: {},
      // 这个就是从@zxing/library导出来的方法，new一个实例
      codeReader: new BrowserMultiFormatReader(),
      // 扫码显示隐藏
      loadingShow: false
    }
  },
  mounted() {
  },
  watch: {
    binCode: function (newVal, oldVal) {
      if (newVal != null && newVal !== '') {
        this.GetbinInfo(newVal)
      }
    }
  },
  methods: {
    // 获取库位
    async GetbinInfo(binCode) {
      const result = await getOne({
        locationCode: binCode
      })
      if (result.data !== null) {
        if (result.data.occupiedState === 0) {
          this.binCode = result.data.locationCode
          this.butShowA = false
          this.binInfo = result.data
        } else {
          Dialog.confirm({
            // title: '标题',
            message: '该库位不是空闲状态',
            showCancelButton: false
          }).then(() => {
            this.binCode = ''
            this.butShowA = true
          })
        }
      } else {
        Dialog.confirm({
          // title: '标题',
          message: '未能获取到该库位信息',
          showCancelButton: false
        }).then(() => {
          this.binCode = ''
          this.butShowA = true
        })
      }
    },
    // 确认入库
    async jumprouter() {
      Dialog.confirm({
        message: `确认库位：${this.binInfo.locationCode} 入库操作`
      }).then(async () => {
        const result = await updateLocationInfo({
          url: '/warehouseLocation/occupation',
          data: [this.binInfo.locationId]
        })
        Dialog.confirm({
          message: result.message,
          showCancelButton: false
        }).then(() => {
          this.binCode = ''
          this.butShowA = true
        })
      })
    },
    // 开打开打
    async openScan() {
      const that = this
      this.loadingShow = true
      that.codeReader.listVideoInputDevices().then(videoInputDevices => {
        if (videoInputDevices.length > 0) {
          // 动态查找后置摄像头，找不到则用最后一个
          const backCamera = videoInputDevices.find(d =>
            d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')
          )
          const firstDeviceId = backCamera
            ? backCamera.deviceId
            : videoInputDevices[videoInputDevices.length - 1].deviceId
          that.decodeFromInputVideoFunc(firstDeviceId)
        } else {
          Dialog.confirm({
            // title: '标题',
            message: '当前没有可用扫码通道',
            showCancelButton: false
          }).then(() => {
            this.binCode = ''
            this.butShowA = true
            that.codeReader && that.codeReader.reset()
            this.loadingShow = false
          })
        }
      }).catch(() => { // 失败回调，为什么这里的失败回调这么写，后面会说的
        Dialog.confirm({
          // title: '标题',
          message: '当前环境不支持获取扫码通道',
          showCancelButton: false
        }).then(() => {
          this.binCode = ''
          this.butShowA = true
          that.codeReader && that.codeReader.reset()
          this.loadingShow = false
        })
      })
    },
    // 这就是在openScan里调的另一个方法，传入想调用的摄像头id和摄像头数量
    decodeFromInputVideoFunc(firstDeviceId) {
      const that = this
      try {
        that.codeReader.decodeFromVideoDevice(firstDeviceId, 'video', (result, err) => {
          // 扫描成功 这个result就是扫描结果，长啥样自己打印出来看看
          if (result) {
            Dialog.confirm({
              message: `扫描库位：${result}`,
              showCancelButton: false
            }).then(async () => {
              this.binCode = JSON.stringify(result)
              this.loadingShow = false
              that.codeReader && that.codeReader.reset()
              this.GetbinInfo(JSON.parse(this.binCode).text)
            })
          }
        })
      } catch (err) {
        Dialog.confirm({
          message: `获取失败${err}`,
          showCancelButton: false
        }).then(() => {
          this.binCode = ''
          this.butShowA = true
          that.codeReader && that.codeReader.reset()
          this.loadingShow = false
        })
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
  padding: 2% 0.5%;
  border: 1px solid #000;
  margin: 0 3.5% 0.14rem;

  div {
    margin: 0.04rem;
    font-size: 0.14rem;
    display: flex;

    .two-thirds {
      width: 64%;
    }

    ::v-deep .van-radio-group {
      margin: 0;
      height: 100%;
      flex: 1;
      background: #f7f8fa;
    }

    h6 {
      height: 100%;
      width: 100%;
      display: flex;

      p {
        button {
          width: 100%;
          height: 100%;
          margin: 0 0 0 -0.1rem;
          padding: 0.04rem 0 0 0;
          background: #fff;
          color: #1989fa;
          border: 0;
        }
      }
    }

    p {
      margin: 0 1%;
      height: 0.28rem;
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

      .field {
        margin: 0;
        padding: 0;
        height: 100%;

        ::v-deep .van-field__label {
          width: 0.6rem !important;

          span {
            line-height: 0.28rem;
            color: #000;
          }

        }

      }
    }

    .Nameinfo {
      width: 0.8rem;
      background: #fff;
    }

    .expreeion {
      width: 1.2rem;
      background: #fff;
    }

    .fff {
      background: #fff;
    }
  }
}

.sesrchSty {
  padding: 0;
  margin: 0 !important;
  height: 100% !important;

  div {
    padding: 0;
    margin: 0 !important;
    height: 100% !important;
  }

  input {
    line-height: 100%;
    text-indent: 0.1rem;
  }

  ::v-deep .van-field__body {
    height: 100% !important;
    padding-left: 0.1rem;
  }

  ::v-deep .van-field__left-icon {
    display: none;
  }
}

.butShow {
  width: 92%;
  margin: 0 3.5%;
  padding: 2% 0.5%;
  // border: 1px solid #000;
  margin-bottom: 0.14rem;

  button {
    height: 0.28rem !important;
    width: 100% !important;
    line-height: 0.28rem !important;
    margin: 0 !important;
    padding: 0 !important;
  }
}

::v-deep .van-button__content,
.van-button__text {
  height: 0.28rem !important;
  line-height: 0.18rem !important;
  margin: 0 !important;
  padding: 0 !important;
}

.scan {
  font-size: 0.26rem;
}

.video {
  width: 100vw;
  height: 100vh;
  z-index: 1;
}

.video-show {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 70vw;
  height: 70vw;
  z-index: 2;
  background: linear-gradient(to left, #fff, #fff) left top no-repeat,
  linear-gradient(to bottom, #fff, #fff) left top no-repeat,
  linear-gradient(to left, #fff, #fff) right top no-repeat,
  linear-gradient(to bottom, #fff, #fff) right top no-repeat,
  linear-gradient(to left, #fff, #fff) left bottom no-repeat,
  linear-gradient(to bottom, #fff, #fff) left bottom no-repeat,
  linear-gradient(to left, #fff, #fff) right bottom no-repeat,
  linear-gradient(to left, #fff, #fff) right bottom no-repeat;
  background-size: 2px 20px, 20px 2px, 2px 20px, 20px 2px;
}

.tip {
  width: 10vw;
  height: 10vw;
  background-color: rgb(45, 236, 45);
  border: 1px solid #ffffff;
  border-radius: 50%;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

.bgc-f4f4f4 {
  background-color: #363636;
}

.page {
  position: relative;
  overflow-y: auto;
  height: 100vh;
}

.change {
  z-index: 100;
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  color: #fff;
  text-align: center;
  background-color: #fff;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  line-height: 60px;
  /* align-content: center; */
}

.el-icon-refresh {
  color: #000;
  font-size: 25px;
}
</style>
