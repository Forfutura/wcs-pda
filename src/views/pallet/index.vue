<template>
  <div class="receiptWarehousing">
    <div class="div-one">
      <van-field v-model="data.palletCode" label="卡板扫码" placeholder="请扫描卡板码"/>
<!--      <van-button @click="openScan">扫码</van-button>-->
    </div>
    <div class="div-one" style="border: 0;margin-top: 4rem">
      <van-button type="info" @click="submit()">
        &nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp解&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp绑&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp
      </van-button>
    </div>
    <div class="page bgc-f4f4f4" v-show="loadingShow">
      <div class="video-show"/>
      <video id="video" ref="video" class="video vjs-fluid" autoplay/>
    </div>
  </div>
</template>

<script>
import { Dialog, Picker, Popup, Toast } from 'vant'
import {binding, deleteBinding, LocationInfo, selectProduction} from '@/api'
import { BrowserMultiFormatReader } from '@zxing/library'

export default {
  components: {
    [Popup.name]: Popup,
    [Picker.name]: Picker
  },
  data () {
    return {
      data: {
        palletCode: null
      },
      columns: [],
      fieldValue: '',
      showPicker: false,
      pickerValue: [],
      locationShowPicker: false,
      locationPickerValue: [],
      locationData: [],
      // 这个就是从@zxing/library导出来的方法，new一个实例
      codeReader: null,
      // 扫码显示隐藏
      loadingShow: false,
      videoElement: null,
      stream: null
    }
  },
  mounted () {
  },
  methods: {
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
              this.data.palletCode = result['text']
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
        if (this.data[item] === null || this.data[item] === '' || this.data[item] === undefined) {
          submit = true
          Toast('请填写完整数据!')
        }
      })
      if (!submit) {
        deleteBinding(this.data).then(res => {
          if (res['result'] === 0 && res['total'] !== 0) {
            Dialog.confirm({
              message: res['message'],
              showCancelButton: false
            }).then(() => {
              Object.keys(this.data).forEach(item => {
                this.data[item] = null
              })
              this.data.status = 1
            })
          } else if (res['total'] === 0) {
            Toast("不存在卡板绑定信息，解绑失败！")
          } else {
            Toast("操作失败！")
          }
        })
      }
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
