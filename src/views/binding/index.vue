<template>
  <div class="receiptWarehousing">
    <div class="div-one">
      <van-field v-model="data.boxCode" label="箱体编码" placeholder="请扫描箱体编码" @keypress="onBoxCodeKeypress"/>
      <van-button @click="selectProduction">查询</van-button>
    </div>
<!--    <div class="div-one">-->
<!--      <van-field-->
<!--        v-model="data.productCode"-->
<!--        is-link-->
<!--        readonly-->
<!--        label="产品编码"-->
<!--        placeholder="请选择产品"-->
<!--        @click="showPickerM()"-->
<!--      />-->
<!--      <van-popup v-model="showPicker" destroy-on-close round position="bottom">-->
<!--        <van-picker-->
<!--          :model-value="pickerValue"-->
<!--          :columns="columns"-->
<!--          show-toolbar-->
<!--          @cancel="showPicker = false"-->
<!--          @confirm="onConfirm"-->
<!--        />-->
<!--      </van-popup>-->
<!--    </div>-->
<!--    <div class="div-one">-->
<!--      <van-field-->
<!--        v-model="data.productName"-->
<!--        is-link-->
<!--        readonly-->
<!--        label="产品名称"-->
<!--        placeholder="请选择产品"-->
<!--        @click="showPickerM()"-->
<!--      />-->
<!--      <van-popup v-model="showPicker" destroy-on-close round position="bottom">-->
<!--        <van-picker-->
<!--          :model-value="pickerValue"-->
<!--          :columns="columns"-->
<!--          show-toolbar-->
<!--          @cancel="showPicker = false"-->
<!--          @confirm="onConfirm"-->
<!--        />-->
<!--      </van-popup>-->
<!--    </div>-->
    <div class="div-one">
      <van-field v-model="data.productCode" label="产品编码" disabled placeholder="请输入产品编码"/>
    </div>
    <div class="div-one">
      <van-field v-model="data.productName" label="产品名称" disabled placeholder="请输入产品名称"/>
    </div>
    <div class="div-one">
      <van-field v-model="data.orderCode" label="订单编码" disabled placeholder="请输入订单编码"/>
    </div>
    <div class="div-one">
      <van-field v-model="data.produceQuantity" type="digit" label="产品数量" placeholder="请输入产品数量"/>
    </div>
<!--    <div class="div-one">-->
<!--      <van-field v-model="data.palletCode" label="卡板扫码" placeholder="请扫描卡板码"/>-->
<!--      <van-button @click="openScan">扫码</van-button>-->
<!--    </div>-->
<!--    <div class="div-one">-->
<!--      <van-field-->
<!--        v-model="data.locationCode"-->
<!--        is-link-->
<!--        readonly-->
<!--        label="库位"-->
<!--        placeholder="请选择库位"-->
<!--        @click="showPickerByLocation()"-->
<!--      />-->
<!--      <van-popup v-model="locationShowPicker" destroy-on-close round position="bottom">-->
<!--        <van-picker-->
<!--          :model-value="locationPickerValue"-->
<!--          :columns="locationData"-->
<!--          show-toolbar-->
<!--          @cancel="locationShowPicker = false"-->
<!--          @confirm="onConfirmByLocation"-->
<!--        />-->
<!--      </van-popup>-->
<!--    </div>-->
    <div class="div-one">
      <van-field v-model="data.locationCode" label="库位扫码" placeholder="请扫描库位码"/>
<!--      <van-button @click="openScan">扫码</van-button>-->
    </div>
    <div class="div-one" style="border: 0;margin-top: 0.8rem">
      <van-button type="info" @click="submit()">
        &nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp确&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp定&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp
      </van-button>
    </div>
    <div class="page bgc-f4f4f4" v-show="loadingShow">
      <div class="video-show"/>
      <video id="video" ref="video" class="video vjs-fluid" autoplay/>
    </div>
  </div>
</template>

<script>
import { Dialog, Toast } from 'vant'
import { binding, selectProduction } from '@/api'
import { BrowserMultiFormatReader } from '@zxing/library'

export default {
  data () {
    return {
      data: {
        boxCode: null,
        produceQuantity: null,
        locationCode: null,
        productName: null,
        productCode: null,
        orderCode: null,
        status: 1,
      },
      // 这个就是从@zxing/library导出来的方法，new一个实例
      codeReader: null,
      // 扫码显示隐藏
      loadingShow: false,
      videoElement: null,
      stream: null,
      // 用于激光扫描的输入缓冲区
      scanBuffer: '',
      // 记录上次按键时间，用于区分扫描和普通键盘输入
      lastScanTime: 0,
      // 扫描输入目标字段
      scanTargetField: null
    }
  },
  mounted () {
    // 添加全局键盘事件监听器
    document.addEventListener('keydown', this.handleGlobalKeyDown)
    document.addEventListener('keypress', this.handleGlobalKeyPress)
    document.addEventListener('keyup', this.handleGlobalKeyUp)
  },
  beforeDestroy () {
    // 移除全局键盘事件监听器
    document.removeEventListener('keydown', this.handleGlobalKeyDown)
    document.removeEventListener('keypress', this.handleGlobalKeyPress)
    document.removeEventListener('keyup', this.handleGlobalKeyUp)
  },
  methods: {
    // 监听箱体编码输入框的按键事件
    onBoxCodeKeypress(event) {
      this.scanTargetField = 'boxCode'
    },

    // 全局键盘按下事件
    handleGlobalKeyDown(event) {
      // 记录扫描开始时间
      const currentTime = new Date().getTime()

      // 如果两次按键间隔超过500毫秒，认为是一次新的扫描
      if (currentTime - this.lastScanTime > 500) {
        this.scanBuffer = ''
      }

      this.lastScanTime = currentTime
    },

    // 全局按键事件（捕获扫描内容）
    handleGlobalKeyPress(event) {
      // 如果是回车键，表示扫描完成
      if (event.key === 'Enter') {
        event.preventDefault()

        // 如果扫描缓冲区不为空，说明是扫描输入
        if (this.scanBuffer.trim() !== '') {
          // 根据焦点所在的字段更新对应的数据
          if (this.scanTargetField) {
            this.data[this.scanTargetField] = this.scanBuffer
            // 根据扫描的目标字段执行相应操作
            if (this.scanTargetField === 'boxCode') {
              this.selectProduction()
            }
          }

          // 清空缓冲区
          this.scanBuffer = ''
          this.scanTargetField = null
        }
      } else {
        // 将字符添加到扫描缓冲区
        this.scanBuffer += event.key
      }
    },

    // 全局键盘释放事件
    handleGlobalKeyUp(event) {
      // 不做特殊处理，保留以防将来扩展
    },

    selectProduction () {
      if (this.data.boxCode) {
        selectProduction({ boxCode: this.data.boxCode }).then(res => {
          if (res.result === 0 && res.data) {
            this.data.productCode = res.data.productCode;
            this.data.productName = res.data.productDescription;
            this.data.orderCode = res.data.SOVoucher;
          } else {
            Toast(res.message || '查询失败')
          }
        }).catch(() => {
          Toast('查询失败，请重试')
        })
      } else {
        Toast('请输入箱体编码!')
      }
    },
    // 开打开打
    async openScan () {
      try {
        this.loadingShow = true
        const devices = await navigator.mediaDevices.enumerateDevices()
        let backCameraId = null

        // 找到后置摄像头
        devices.forEach(device => {
          if (device.kind === 'videoinput') {
            if (device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('rear')) {
              backCameraId = device.deviceId
            }
          }
        })

        // 如果找到后置摄像头，使用它
        if (backCameraId) {
          this.stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: backCameraId } }
          })
        } else {
          // 尝试使用 facingMode 强制调用后置摄像头
          this.stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: 'environment' } }
          })
        }

        this.videoElement = document.getElementById('video')

        // 将视频流绑定到 video 元素上
        if (this.videoElement) {
          this.videoElement.srcObject = this.stream
          this.startQRCodeReader()
        }
      } catch (err) {
        this.loadingShow = false
        await Dialog.alert({ message: '无法访问摄像头: ' + err.message })
      }
    },
    //这就是在openScan里调的另一个方法，传入想调用的摄像头id和摄像头数量
    startQRCodeReader () {
      if (this.videoElement) {
        const video = this.videoElement
        // 初始化二维码阅读器
        this.codeReader = new BrowserMultiFormatReader()
        // 使用 zxing 的 decodeFromVideoElement 方法
        this.codeReader.decodeFromVideoElement(video).then(result => {
          if (result) {
            Dialog.confirm({
              message: `扫描卡板：${result}`,
              showCancelButton: false
            }).then(async () => {
              // 根据当前焦点确定扫描结果应填入的字段
              if (this.scanTargetField) {
                this.data[this.scanTargetField] = result['text']
              } else {
                // 默认填入palletCode
                this.data.palletCode = result['text']
              }

              this.loadingShow = false
              this.codeReader && this.codeReader.reset()
            })
          } else {
            this.data.palletCode = ''
            Dialog.alert({ message: '未识别到卡板' })
          }
          this.stopCamera()
          if (this.codeReader) {
            this.codeReader.reset() // 重置二维码扫描器
          }
        })
      }
    },
    stopCamera () {
      if (this.stream) {
        // 停止所有轨道
        this.stream.getTracks().forEach(track => track.stop())
        this.stream = null // 清空流的引用
      }
    },
    submit () {
      let submit = false
      Object.keys(this.data).forEach(item => {
        if (item === 'status') return
        if (this.data[item] === null || this.data[item] === '' || this.data[item] === undefined) {
          submit = true
        }
      })
      if (submit) {
        Toast('请填写完整数据!')
        return
      }
      binding(this.data).then(res => {
          if (res['result'] === 0) {
            Dialog.confirm({
              message: res['message'],
              showCancelButton: false
            }).then(() => {
              Object.keys(this.data).forEach(item => {
                this.data[item] = null
              })
              this.data.status = 1
            })
          }else {
            Toast(res['message'])
          }
        })
    }
  }
}

</script>

<style scoped lang="less">
.div-one {
  padding: 0 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
  border: 1px black solid;
  border-radius: 5px;
  margin: 8px;
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
  position: absolute;
  top: 0;
  left: 0;
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

</style>
