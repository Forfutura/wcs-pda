<template>
  <div class="receiptWarehousing">
    <!-- <van-divider :style="{ color: '#1989fa', borderColor: '#1989fa', padding: '0 16px' }">
        下发任务流程： 选择出库库区、库位 ➡ 选择入库库区、库位
    </van-divider> -->
    <div v-show="!loadingShow">
      <div class="taskList">
        <div>
          <p class="expression" @click="openRowDropdown">箱体编码：</p>
          <van-field
            ref="boxCodeInput"
            v-model="data.boxCode"
            placeholder="请扫描箱体编码"
            class="searchSt"
            input-align="left"
            @keydown.enter.native.prevent="handleBoxCodeQueryEnter"
          />
          <van-button @click="selectOrderCode" class="query-btn">查询</van-button>
        </div>
      </div>
      <div class="taskList">
        <div>
          <p class="expression" @click="openRowDropdown">订单编码：</p>
            <van-field
              v-model="data.soOrderCode"
              placeholder="请输入订单编码"
              class="searchSt"
              input-align="left"
              @keydown.enter.native.prevent="handleOrderCodeQueryEnter"
            />
          <van-button @click="selectLocation" class="query-btn">查询</van-button>
        </div>
      </div>
      <div class="taskList">
        <div>
          <p class="expression" @click="openRowDropdown">产品数量：</p>
          <van-field
            ref="produceQuantityInput"
            v-model="data.produceQuantity"
            placeholder="请输入产品数量"
            class="searchSt"
            input-align="left"
            @keyup.enter="handleProduceQuantityEnter"
            @keydown.enter.prevent="handleProduceQuantityEnter"
          />
        </div>
      </div>
      <div class="taskList">
        <div>
          <p class="expression" @click="openRowDropdown">任务类型：</p>
          <div class="dd-wrap">
            <van-dropdown-menu>
              <van-dropdown-item v-model="taskType" :options="taskTypeList"
                                 @change="handleTaskTypeChange"></van-dropdown-item>
            </van-dropdown-menu>
          </div>
        </div>
      </div>
      <div class="taskList" v-if="show.startAreaVisible">
        <div>
          <p class="expression" @click="openRowDropdown">开始库区：</p>
          <div class="dd-wrap">
            <van-dropdown-menu>
              <van-dropdown-item v-model="data.startArea" :options="orderAreaList"
                                 @change="handleChangeAreaOption(1)"></van-dropdown-item>
            </van-dropdown-menu>
          </div>
        </div>
      </div>
      <div class="taskList" v-if="show.startLocationVisible">
        <div>
          <p class="expression" @click="openRowDropdown">开始库位：</p>
          <div class="dd-wrap">
            <van-dropdown-menu>
              <van-dropdown-item v-model="data.startLocation" :options="orderLocationList"/>
            </van-dropdown-menu>
          </div>
        </div>
      </div>
      <div class="taskList" v-if="show.startLocationVisible">
        <div>
          <p class="expression" @click="openRowDropdown">开始库位：</p>
          <p>
            <van-search
              ref="startLocationInput"
              v-model="data.startLocation"
              placeholder="请扫描开始库位"
              class="searchSty"
              @keyup.enter="handleStartLocationEnter"
              @keydown.enter.prevent="handleStartLocationEnter"
            />
          </p>
          <van-icon name="scan" class="scan" @click="getBackCamera('start')"/>
        </div>
      </div>
      <div class="taskList" v-if="show.endAreaVisible">
        <div>
          <p class="expression" @click="openRowDropdown">终点库区：</p>
          <div class="dd-wrap">
            <van-dropdown-menu>
              <van-dropdown-item v-model="data.endArea" :options="endAreaList" @change="handleChangeAreaOption(0)"/>
            </van-dropdown-menu>
          </div>
        </div>
      </div>
      <div class="taskList" v-if="show.endLocationVisible">
        <div>
          <p class="expression" @click="openRowDropdown">终点库位：</p>
          <div class="dd-wrap">
            <van-dropdown-menu>
              <van-dropdown-item v-model="data.endLocation" :options="endLocationList" @change="handleChangeEndLocation()"/>
            </van-dropdown-menu>
          </div>
        </div>
      </div>
      <div class="taskList" v-if="show.endLocationVisible">
        <div>
          <p class="expression" @click="openRowDropdown">终点库位：</p>
          <p>
            <van-search
              ref="endLocationInput"
              v-model="data.endLocation"
              placeholder="请扫描终点库位"
              class="searchSty"
              @keyup.enter="handleEndLocationEnter"
              @keydown.enter.prevent="handleEndLocationEnter"
            />
          </p>
          <van-icon name="scan" class="scan" @click="getBackCamera('end')"/>
        </div>
      </div>
      <div class="taskList" v-if="show.materialScanVisible">
        <div>
          <p class="expression" @click="openRowDropdown">物料编码：</p>
          <p>
            <van-search v-model="data.materialCode" placeholder="请扫描物料码" class="searchSty"/>
          </p>
          <van-icon name="scan" class="scan" @click="getBackCamera('material')"/>
        </div>
      </div>
      <div class="taskList" v-if="show.materialVisible">
        <div>
          <p class="expression" @click="openRowDropdown">物料编码：</p>
          <div class="dd-wrap">
            <van-dropdown-menu>
              <van-dropdown-item v-model="data.materialCode" :options="materialList"/>
            </van-dropdown-menu>
          </div>
        </div>
      </div>
      <div>
        <div class="taskList" style="border: 0">
          <div>
            <p>
              <van-button type="info" :disabled="buttonDisabled" @click="SubmitOrder()">
                发起订单
              </van-button>
            </p>
          </div>
        </div>
      </div>
    </div>
    <div v-show="loadingShow">
      <div class="video-show"/>
      <video ref="videoElement" style="width: 100%;height: 100%" autoplay playsinline/>
    </div>
  </div>
</template>
<script setup>
import {AreaInfo, LocationInfo, MaterialOptions, orderNew, getOne, selectOrderLocation, selectProduction, LocationIsLock} from '@/api'
import {Dialog, Toast} from 'vant'
import { BrowserMultiFormatReader } from '@zxing/library'
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

const code = ref('ZTEV1_TASK9') // 任务编码前缀

// 整行都能点开下拉：标签（.expression）和下拉控件是同一行里的两个独立元素，
// Vant 只让下拉自己的 __item 响应点击。这里让点标签时「转点」同一行下拉的 __item，
// 从而展开选项（该行没有下拉时 querySelector 返回 null，自然 no-op）。
const openRowDropdown = (e) => {
  const row = e.currentTarget && e.currentTarget.parentElement
  if (!row) return
  const item = row.querySelector('.van-dropdown-menu__item')
  if (item) item.click()
}
let allLocationList = ref([]) // 所有库位
let freeLocationList = ref([]) // 空闲库区
let noFreeLocationList = ref([]) //有货库区
let startAreaList = ref([]) // 起始库区
let startLocationList = ref([]) // 起始库位
let orderLocationList = ref([]) // 订单查询拿到的起始库位
let orderAreaList = ref([]) // 订单查询拿到的起始库区
let endAreaList = ref([]) // 终点库区
let endLocationList = ref([]) // 终点库位
let taskType = ref(1) // 任务类型
const taskTypeList = ref([ // 任务类型选择
  {
    text: '点到点',
    value: 1
  },
  // {
  //   text: '点到区域',
  //   value: 2
  // },
  // {
  //   text: '物料到点',
  //   value: 3
  // }
])
let buttonDisabled = ref(false)
let data = ref({
  boxCode: null,
  soOrderCode: null,
  produceQuantity: null,
  productName: null,
  productCode: null,
  orderCode: null,
  startArea: null,
  startLocation: null,
  endArea: null,
  endLocation: null,
  materialCode: null
})
let endFlag = ref(true) // 开关
let startFlag = ref(true)
let materialList = ref([]) // 物料列表
let codeReader = null // 这个就是从@zxing/library导出来的方法，new一个实例
let loadingShow = ref(false) // 扫码显示隐藏

let show = ref({ // 显示
  startAreaVisible: true,
  startLocationVisible: true,
  startLocationScanVisible: false,
  endAreaVisible: true,
  endLocationVisible: true,
  endLocationScanVisible: false,
  materialScanVisible: false,
  materialVisible: false
})
let spotSendSpotVisible = ref({ // 点到点
  startAreaVisible: true,
  startLocationVisible: true,
  endAreaVisible: true,
  endLocationVisible: true
})
let spotSendAreaVisible = ref({ // 点到区域
  startAreaVisible: true,
  startLocationScanVisible: false,
  startLocationVisible: true,
  endAreaVisible: true,
  materialScanVisible: false
})

let materialSendSpot = ref({ // 区域到点
  startAreaVisible: true,
  endAreaVisible: true,
  endLocationScanVisible: true,
  materialVisible: true
})

let stream = null // 摄像头视频流
const videoElement = ref(null) // 绑定到 <video> 元素
const boxCodeInput = ref(null) // 箱体编码输入框引用
const produceQuantityInput = ref(null) // 产品数量输入框引用
const startLocationInput = ref(null) // 开始库位输入框引用
const endLocationInput = ref(null) // 终点库位输入框引用

const temporaryArea = ref(['MT-ELE', 'MT-MTS']) // 暂存区这里加

watch(() => data.value.materialCode, (newVal) => {
  if (newVal) {
    const regex = /\d{2}-\d{3}-\d{5}-\d{2}/
    let material = newVal['match'](regex) ? newVal['match'](regex) : []
    if (material.length > 0) {
      data.value.materialCode = material[0]
    } else {
      data.value.materialCode = null
      Dialog.alert({ message: '未识别出物料编码' })
    }
  }
})

watch(() => data.value.startLocation, (newVal) => {
  // 赋值逻辑已移至 checkStartLocation，由 Enter 或扫码触发
})
watch(() => data.value.endLocation, (newVal) => {
  // 赋值逻辑已移至 checkEndLocation，由 Enter 或扫码触发
})

// 扫码输入框按下 Enter 后触发的检测逻辑
const checkStartLocation = (val) => {
  if (!val) return
  const startLocation = orderLocationList.value.filter(item => item['value'] === val)
  if (startLocation && startLocation.length > 0) {
    const startLocationTemp = allLocationList.value.filter(item => item['code'] === startLocation[0]['value'])
    if (startLocationTemp && startLocationTemp.length > 0) {
      const startArea = orderAreaList.value.filter(item => item['id'] === startLocationTemp[0]['areaId'])
      if (startArea && startArea.length > 0) {
        data.value.startArea = startArea[0].value
      }
    } else {
      Toast('该开始库位不是有货状态')
    }
  } else {
    selectOrderCodeByStartLocation(val)
  }
  if (taskType.value === 3) {
    GetLocation(val, 'start')
  }
}

const checkEndLocation = (val) => {
  if (!val) return
  const endLocation = freeLocationList.value.filter(item => item['code'] === val)
  if (endLocation.length > 0) {
    data.value.endArea = endAreaList.value.filter(item => item['id'] === endLocation[0]['areaId'])[0].value
    const obj = { text: val, value: val }
    if (!endLocationList.value.find(i => i.value === val)) {
      endLocationList.value.push(obj)
    }
  } else {
    Toast('该终点库位不是空闲状态')
  }
  if (taskType.value === 3) {
    GetLocation(val, 'end')
  }
}

onMounted(() => {
  GetAreaInfo()
  getAllLocation()
  // 页面加载完成后聚焦到箱体编码输入框
  setTimeout(() => {
    console.log('Attempting to focus box code input on mount')
    focusBoxCodeInput()
  }, 1000)
})

onUnmounted(() => {
  stopCamera()
  if (codeReader) {
    codeReader.reset()
  }
})

const getAllLocation = async () => {
  const result = await LocationInfo({
    pageNo: 1,
    pageSize: 100000,
    // status: 1
  })
  if (result['data'].length > 0) {
    allLocationList.value = []
    freeLocationList.value = []
    noFreeLocationList.value = []
    result['data'].forEach(item => {
      allLocationList.value.push(item)
    })
    result['data'].forEach(item => {
      if (item.status === 1) {
        freeLocationList.value.push(item)
      } else if (item.status === 2) {
        noFreeLocationList.value.push(item)
      }
    })
  } else {
    await Dialog.alert({ message: '获取库位数据失败' })
  }
}

// 通过订单编码查询起点库位
const selectLocation = (value) =>  {
  orderLocationList.value = [];
  orderAreaList.value = [];
  data.value.startArea = null;
  data.value.startLocation = null;
  if (data.value.soOrderCode) {
    selectOrderLocation({orderCode: data.value.soOrderCode, flag: 1, pageNo: 1, pageSize: 10000}).then(res => {
      if (res.data) {
        res.data.forEach(item => {
          orderLocationList.value.push({
            text: item.locationCode,
            value: item.locationCode
          });
        })
        if (res.data[0].warehouseAreaInfoPos) {
          res.data[0].warehouseAreaInfoPos.forEach(item => {
            orderAreaList.value.push({
              text: item.areaName,
              value: item.areaCode,
              id: item.id
            })
          })
        }
      } else {
        Toast('暂无此订单数据')
      }
    })
  } else {
    Toast('请输入订单编码!')
  }
}

// 通过箱体编码查询订单编码和起点库位
const selectOrderCode = (value) =>  {
  orderLocationList.value = [];
  orderAreaList.value = [];
  data.value.soOrderCode = null;
  data.value.productCode = null;
  data.value.productName = null;
  data.value.startArea = null;
  data.value.startLocation = null;
  if (data.value.boxCode) {
    selectOrderLocation({boxCode: data.value.boxCode, flag: 1, pageNo: 1, pageSize: 10000}).then(res => {
      if (res.data) {
        data.value.soOrderCode = res.data[0].orderCode;
        data.value.productCode = res.data[0].productCode;
        data.value.productName = res.data[0].productDescription;

        res.data.forEach(item => {
          orderLocationList.value.push({
            text: item.locationCode,
            value: item.locationCode
          });
        })
        if (res.data[0].warehouseAreaInfoPos) {
          res.data[0].warehouseAreaInfoPos.forEach(item => {
            orderAreaList.value.push({
              text: item.areaName,
              value: item.areaCode,
              id: item.id
            })
          })
        }
      } else {
        // 去查询箱体编码
        selectProduction({ boxCode: data.value.boxCode }).then(res => {
          if (res.data) {
            data.value.productCode = res.data.productName;
            data.value.productName = res.data.productDescription;
            data.value.soOrderCode = res.data.SOVoucher;
          } else {
            Toast('暂无此箱体数据')
          }
        })
      }
    })
  } else {
    Toast('请扫描箱体编码!')
  }
}

// 通过起点库位查询箱体编码和订单编码信息
const selectOrderCodeByStartLocation = async (locationCode) => {
  orderLocationList.value = []
  orderAreaList.value = []

  if (!locationCode) {
    Toast('请扫描开始库位!')
    return
  }

  // 避免无匹配时旧值残留
  // data.value.soOrderCode = null
  // data.value.boxCode = null

  try {
    const res = await selectOrderLocation({ locationCode, flag: 1, pageNo: 1, pageSize: 10000 })
    if (res && res.data && res.data.length > 0) {
      const first = res.data[0] || {}
      data.value.soOrderCode = first.orderCode || null
      data.value.boxCode = first.boxCode || null

      res.data.forEach(item => {
        orderLocationList.value.push({
          text: item.locationCode,
          value: item.locationCode
        })
      })

      if (first.warehouseAreaInfoPos) {
        first.warehouseAreaInfoPos.forEach(item => {
          orderAreaList.value.push({
            text: item.areaName,
            value: item.areaCode,
            id: item.id
          })
        })
      }

      // 回填开始库区
      const startLocationTemp = allLocationList.value.filter(item => item['code'] === locationCode)
      if (startLocationTemp && startLocationTemp.length > 0) {
        const startArea = orderAreaList.value.filter(item => item['id'] === startLocationTemp[0]['areaId'])
        if (startArea && startArea.length > 0) {
          data.value.startArea = startArea[0].value
        }
      }
    } else {
      // 自动填充起点库位对应的库区信息
      const startLocation = allLocationList.value.filter(item => item['code'] === locationCode)
      if (startLocation && startLocation.length > 0) {
        data.value.startArea = startAreaList.value.filter(item => item['id'] === startLocation[0]['areaId'])[0].value
        const obj = {
          text: data.value.startLocation,
          value: data.value.startLocation
        }
        orderLocationList.value.push(obj)
        orderAreaList.value = startAreaList.value
      } else {
        Toast('该开始库位不是有货状态')
      }
    }
  } catch (e) {
    Toast('查询失败')
  }
}

// 获取库区
const GetAreaInfo = async () => {
  const result = await AreaInfo({
    pageNo: 1,
    pageSize: 10000
  })
  if (result['data'] !== null) {
    // 父库区行紧挨在其子库区之前（同组按 areaCode）。后端是 id desc，不排父子会交错。
    const list = (result['data'] || []).slice().sort((a, b) => {
      const ga = a['parentId'] ? a['parentId'] : a['id']
      const gb = b['parentId'] ? b['parentId'] : b['id']
      if (ga !== gb) { return ga - gb }
      return String(a['areaCode']).localeCompare(String(b['areaCode']))
    })
    list.forEach(item => {
      const option = {
        // 父库区只是分组壳，标注出来免得操作员以为选错了
        text: item['parentId'] ? item['areaName'] : `${item['areaName']}（父库区）`,
        value: item['areaCode'],
        id: item['id'],
        parentId: item['parentId'] || null
      }
      endAreaList.value.push(option)
      startAreaList.value.push(option)
    })
  }
}

// 获取物料列表
const getMaterialOptions = async (locationCode) => {
  const result = await MaterialOptions(locationCode)
  materialList.value = []
  if (result.data) {
    result.data.forEach(element => {
      materialList.value.push({
        text: element['materialName'],
        value: element['materialCode']
      })
    })
  }
}

const SubmitOrder = async () => { // 提交订单
  let flag = true
  if (taskType.value === 1) {
    if (data.value.boxCode === null || data.value.boxCode === '') {
      flag = false
    }
    if (data.value.soOrderCode === null || data.value.soOrderCode === '') {
      flag = false
    }
    if (data.value.startLocation === null || data.value.startLocation === '') {
      flag = false
    }
    if (data.value.startArea === null || data.value.startArea === '') {
      flag = false
    }
    if (data.value.endArea === null || data.value.endArea === '') {
      flag = false
    }
    if (data.value.endLocation === null || data.value.endLocation === '') {
      flag = false
    }
  }
  if (taskType.value === 2) {
    if (data.value.startArea === null || data.value.startArea === '') {
      flag = false
    }
    if (data.value.startLocation === null || data.value.startLocation === '') {
      flag = false
    }
    if (data.value.endArea === null || data.value.endArea === '') {
      flag = false
    }
    if (temporaryArea.value['includes'](data.value.endArea)) {
      if (data.value.materialCode === null) {
        flag = false
      }
    }
  }
  if (taskType.value === 3) {
    if (data.value.startArea === null || data.value.startArea === '') {
      flag = false
    }
    if (data.value.endArea === null || data.value.endArea === '') {
      flag = false
    }
    if (data.value.endLocation === null || data.value.endLocation === '') {
      flag = false
    }
    if (data.value.materialCode === null || data.value.materialCode === '') {
      flag = false
    }
  }
  if (flag) {
    buttonDisabled.value = true
    data.value.type = taskType.value
    data.value.orderCode = code.value
    const result = await orderNew(data.value)
    if (result) {
      buttonDisabled.value = false
    }
    if (result['result'] === -1) {
      Dialog.alert({
        message: result['message'],
        showCancelButton: false
      })
    } else {
      Dialog.alert({
        message: result['message'],
        showCancelButton: false
      }).then(async () => {
        await getAllLocation()
        Object.keys(data.value).forEach(key => {
          data.value[key] = null
        })
      })
    }
  } else {
    await Dialog.alert({ message: '请选择为空的选项' })
  }
}

const handleTaskTypeChange = (value) => {
  let arr = {}
  if (value === 1) arr = spotSendSpotVisible.value
  if (value === 2) arr = spotSendAreaVisible.value
  if (value === 3) arr = materialSendSpot.value
  Object.keys(show.value).forEach(key => {
    if (arr.hasOwnProperty(key)) {
      show.value[key] = arr[key]
    } else {
      show.value[key] = false
    }
  })
  Object.keys(data.value).forEach(key => {
    data.value[key] = null
  })
  // 任务类型改变后重新聚焦到箱体编码输入框
  setTimeout(() => {
    focusBoxCodeInput()
  }, 300)
}

// 聚焦到箱体编码输入框
const focusBoxCodeInput = () => {
  nextTick(() => {
    try {
      let inputElement = null

      if (boxCodeInput.value) {
        if (boxCodeInput.value.$el) {
          inputElement = boxCodeInput.value.$el.querySelector('input')
        }
        if (!inputElement && boxCodeInput.value.querySelector) {
          inputElement = boxCodeInput.value.querySelector('input')
        }
        if (!inputElement) {
          inputElement = document.querySelector('.taskList input[placeholder="请扫描箱体编码"]')
        }
      }

      if (inputElement) {
        inputElement.focus()
        console.log('Box code input focused successfully')
      } else {
        console.log('Could not find box code input element')
      }
    } catch (error) {
      console.error('Error focusing box code input:', error)
    }
  })
}

// 聚焦到产品数量输入框
const focusProduceQuantityInput = () => {
  nextTick(() => {
    try {
      let inputElement = null

      if (produceQuantityInput.value) {
        if (produceQuantityInput.value.$el) {
          inputElement = produceQuantityInput.value.$el.querySelector('input')
        }
        if (!inputElement && produceQuantityInput.value.querySelector) {
          inputElement = produceQuantityInput.value.querySelector('input')
        }
        if (!inputElement) {
          inputElement = document.querySelector('.taskList input[placeholder="请输入产品数量"]')
        }
      }

      if (inputElement) {
        inputElement.focus()
        console.log('Produce quantity input focused successfully')
      } else {
        console.log('Could not find produce quantity input element')
      }
    } catch (error) {
      console.error('Error focusing produce quantity input:', error)
    }
  })
}

// 聚焦到开始库位输入框
const focusStartLocationInput = () => {
  if (show.value.startLocationVisible) {
    nextTick(() => {
      try {
        let inputElement = null

        if (startLocationInput.value) {
          if (startLocationInput.value.$el) {
            inputElement = startLocationInput.value.$el.querySelector('input')
          }
          if (!inputElement && startLocationInput.value.querySelector) {
            inputElement = startLocationInput.value.querySelector('input')
          }
          if (!inputElement) {
            inputElement = document.querySelector('.taskList input[placeholder="请扫描开始库位"]')
          }
        }

        if (inputElement) {
          inputElement.focus()
          console.log('Start location input focused successfully')
        } else {
          console.log('Could not find start location input element')
        }
      } catch (error) {
        console.error('Error focusing start location input:', error)
      }
    })
  }
}

// 聚焦到终点库位输入框
const focusEndLocationInput = () => {
  if (show.value.endLocationVisible) {
    nextTick(() => {
      try {
        let inputElement = null

        if (endLocationInput.value) {
          if (endLocationInput.value.$el) {
            inputElement = endLocationInput.value.$el.querySelector('input')
          }
          if (!inputElement && endLocationInput.value.querySelector) {
            inputElement = endLocationInput.value.querySelector('input')
          }
          if (!inputElement) {
            inputElement = document.querySelector('.taskList input[placeholder="请扫描终点库位"]')
          }
        }

        if (inputElement) {
          inputElement.focus()
          console.log('End location input focused successfully')
        } else {
          console.log('Could not find end location input element')
        }
      } catch (error) {
        console.error('Error focusing end location input:', error)
      }
    })
  }
}

// 处理箱体编码输入框回车事件
const handleBoxCodeQueryEnter = () => {
  selectOrderCode()
  handleBoxCodeEnter()
}

const handleBoxCodeEnter = () => {
  console.log('Enter pressed on box code input')
  setTimeout(() => {
    focusProduceQuantityInput()
  }, 100)
}

// 处理产品数量输入框回车事件
const handleProduceQuantityEnter = () => {
  console.log('Enter pressed on produce quantity input')
  setTimeout(() => {
    focusStartLocationInput()
  }, 100)
}

// 处理订单编码输入框回车事件
const handleOrderCodeQueryEnter = () => {
  selectLocation()
  setTimeout(() => {
    focusProduceQuantityInput()
  }, 100)
}

// 处理开始库位输入框回车事件
const handleStartLocationEnter = () => {
  checkStartLocation(data.value.startLocation)
  setTimeout(() => {
    focusEndLocationInput()
  }, 100)
}

// 处理终点库位输入框回车事件
const handleEndLocationEnter = () => {
  checkEndLocation(data.value.endLocation)
}

// 库区 id 展开成叶子库区 id 列表：选中的是**父库区**时返回其子库区 id（按 areaCode 升序），
// 否则返回 [自己]。库位只挂子库区，直接按父区 id 过滤必然为空。
const resolveLeafAreaIds = (areaId) => {
  const children = startAreaList.value
    .filter(item => item.parentId === areaId)
    .sort((a, b) => String(a.value).localeCompare(String(b.value)))
  return children.length ? children.map(c => c.id) : [areaId]
}

const handleChangeAreaOption = async (occupiedState) => {
  let value = ''
  if (occupiedState === 0){
    endAreaList.value.forEach((item) => {
      if (item.value === data.value.endArea){
        value = item.id
      }
    })
  }
  if (occupiedState === 1){
    startAreaList.value.forEach((item) => {
      if (item.value === data.value.startArea){
        value = item.id
      }
    })
  }
  const leafIds = resolveLeafAreaIds(value)
  if (occupiedState === 1) {
    const locationList = noFreeLocationList.value.filter(item => leafIds.includes(item['areaId']))
    startLocationList.value = []
    data.value.startLocation = null
    locationList.forEach(item => {
      const obj = {
        text: item['code'],
        value: item['code']
      }
      startLocationList.value.push(obj)
    })
    startFlag.value = !startLocationList.value.length > 0
    if (taskType.value === 3) {
      await getMaterialOptions(data.value.startArea)
    }
  }
  if (occupiedState === 0) {
    const locationList = freeLocationList.value.filter(item => leafIds.includes(item['areaId']))
    endLocationList.value = []
    data.value.endLocation = null
    locationList.forEach(item => {
      const obj = {
        text: item['code'],
        value: item['code']
      }
      endLocationList.value.push(obj)
    })
    endFlag.value = !endLocationList.value.length > 0
    if (taskType.value === 2) {
      show.value.materialScanVisible = temporaryArea.value.includes(data.value.endArea)
    }
  }
}

// 选择目标点位之后检查是否上锁
const handleChangeEndLocation = async () => {
  const value = data.value.endLocation
  if (!value) return
  // 查询该目标库位是否已被上锁
  const res = await LocationIsLock(value)
  if (res.result === 0 && res.data === true) {
    // 目标点位已上锁，不允许选择，清除当前选择
    data.value.endLocation = null
    await Dialog.alert({ message: '该目标库位已上锁，请重新选择' })
  }
}

// 获取摄像头并选择后置摄像头
const getBackCamera = async (code) => {
  try {
    loadingShow.value = true
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
      stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: backCameraId } }
      })
    } else {
      // 尝试使用 facingMode 强制调用后置摄像头
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: 'environment' } }
      })
    }

    // 将视频流绑定到 video 元素上
    if (videoElement.value) {
      videoElement.value.srcObject = stream
      startQRCodeReader(code)
    }
  } catch (err) {
    loadingShow.value = false
    await Dialog.alert({ message: '无法访问摄像头: ' + err.message })
  }
}

// 销毁视频流
const stopCamera = async () => {
  if (stream) {
    // 停止所有轨道
    stream.getTracks().forEach(track => track.stop())
    stream = null // 清空流的引用
  }
}

// 开始扫描二维码
const startQRCodeReader = (code) => {
  if (videoElement.value) {
    const video = videoElement.value
    // 初始化二维码阅读器
    codeReader = new BrowserMultiFormatReader()
    // 使用 zxing 的 decodeFromVideoElement 方法
    codeReader.decodeFromVideoElement(video).then(result => {
      if (result) {
        switch (code) {
          case 'material': // 扫描物料
            let material = JSON.parse(JSON.stringify(result))
            scanMaterial(material.text)
            break
          case 'start': // 扫描起点库位
            scanStartLocation(result)
            break
          case 'end': // 扫描终点库位
            scanEndLocation(result)
            break
        }
        loadingShow.value = false
        stopCamera()
        if (codeReader) {
          codeReader.reset() // 重置二维码扫描器
        }
      }
    })
  }
}

const scanMaterial = (value) => {
  data.value.materialCode = value
}

const scanEndLocation = (value) => {
  const result = JSON.parse(JSON.stringify(value))
  data.value.endLocation = result.text
  checkEndLocation(result.text)
}

const scanStartLocation = (value) => {
  const result = JSON.parse(JSON.stringify(value))
  data.value.startLocation = result.text
  checkStartLocation(result.text)
}

// 获取库位信息
const GetLocation = async (locationCode, code) => {
  await getOne({ locationCode: locationCode }).then(res => {
    if (res.data != null) {
      switch (code) {
        case 'start':
          if (res.data['occupiedState'] === 1) {
            data.value.startLocation = res.data['locationCode']
            Dialog.alert({ message: `扫描库位： ${data.value.startLocation}` })
          } else {
            Dialog.alert({ message: '扫描的库位未被占用' })
            data.value.startLocation = null
          }
          break
        case 'end':
          if (res.data['occupiedState'] === 0) {
            data.value.endLocation = res.data['locationCode']
            Dialog.alert({ message: `扫描库位： ${data.value.endLocation}` })
          } else {
            Dialog.alert({ message: '扫描的库位已被占用' })
            data.value.endLocation = null
          }
          break
      }
    } else {
      Dialog.alert({ message: '扫描的库位码不存在，请重新扫描' })
      if (code === 'start') {
        data.value.startLocation = null
      } else {
        data.value.endLocation = null
      }
    }
  })
}
</script>
<style lang="less" scoped>
.searchSt {
  width: calc(100% - 60px);
  padding: 0;
  margin: 0 !important;
  height: 30px;
  line-height: 30px;
  display: flex;
  align-items: center;

  .van-field__control {
    padding: 0 0.1rem;
    line-height: 0.26rem;
    text-indent: 0.1rem;
  }
}

.query-btn {
  margin-left: 10px;
  height: 30px;
  font-size: 12px;
  padding: 0 8px;
  min-width: 50px;
  align-self: center;
}

.search {
  background-color: #f1f1f1;
  border: 1px solid #ddd;
  padding: 5px;
  margin: 5px;
}

::v-deep .van-divider {
  margin: 0.03rem 0;
}

/* 下拉包裹层：撑满 label 右侧剩余宽度，让整行都成为可点区域 */
.dd-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
}

::v-deep .van-dropdown-menu {
  margin: 0 !important;
  flex: 1;
  /* ★ min-width:0 必须：下拉文字是 white-space:nowrap，min-content = 整段文字宽度，
     不加这个它会把左侧标签挤成一条、把整行撑爆 */
  min-width: 0;
  min-height: 0.44rem;
  height: auto !important;
}

/* 下拉条固定 44px 高：原来 height:100% 在无高度的父级里会塌掉，手指点不准。
   这条灰底就是【下拉控件本身】，不是多余的框；下面把可点的 item 撑满它。 */
::v-deep .van-dropdown-menu__bar {
  height: 0.44rem !important;
  min-height: 0.44rem;
  min-width: 0;
  background: #f7f8fa !important;
  box-shadow: 0 3px 45px rgb(100 101 102 / 12%) !important
}

/* Vant 把 click 绑在 __item 上（默认已是 flex:1），这里再撑满整条高度 */
::v-deep .van-dropdown-menu__item {
  height: 100%;
}

/* 文本区撑满 item 并左对齐 —— 视觉上就是一个占满宽度的下拉框 */
/* 文本区撑满整条 —— 关键：Vant 里 __title 是 <span>（display:inline），
   不加 display:block 时 width:100% 完全不生效，所以没有文字时只剩一个箭头。
   （与 placeOrder 保持一致） */
::v-deep .van-dropdown-menu__title {
  display: block;
  width: 100%;
  box-sizing: border-box;
  text-align: left;
  padding: 0 0.26rem 0 0.08rem;
  line-height: 0.44rem;
  font-size: 0.15rem;
}

::v-deep .van-dropdown-menu__title::after {
  right: 0.1rem;
}

.taskType {
  font-size: 18px;
}

.taskList {
  width: 92%;
  padding: 1% 0.5%;
  border: 1px solid #000;
  border-radius: 5px;
  margin: 0 3% 0.14rem;

  div {
    margin: 0.02rem;
    display: flex;
    font-size: 0.15rem;

    .two-thirds {
      width: 64%;
    }

    ::v-deep .van-radio-group {
      height: 100%;
      flex: 1;
      background: #f7f8fa;
      margin: 0 1% 0 0;
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
        }
      }
    }

    p {
      margin: 0 1%;
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

    .NameInfo {
      width: 0.8rem;
      background: #fff;
    }

    .expression {
      width: 1.6rem;
      /* ★ 不许被压缩：否则下拉里的 nowrap 长文字会把标签挤成一条（曾出现标签只剩 30px） */
      flex: 0 0 auto;
      background: #fff;
    }

    .fff {
      background: #fff;
    }
  }
}

.scan {
  font-size: 0.26rem;
}

.searchSty {
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

  ::v-deep .van-field__left-icon {
    display: none;
  }
}

.bgc-f4f4f4 {
  background-color: #363636;
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

.butShow {
  width: 92%;
  padding: 2% 0.5%;
  // border: 1px solid #000;
  margin: 0 3.5% 0.14rem;

  button {
    height: 0.32rem !important;
    width: 100% !important;
    line-height: 0.32rem !important;
    margin: 0 !important;
    padding: 0 !important;
  }
}

::v-deep .van-button__content,
.van-button__text {
  height: 0.32rem !important;
  width: 100% !important;
  line-height: 0.28rem !important;
  margin: 0 !important;
  padding: 0 !important;
}

::v-deep .van-dropdown-item__content {
  position: absolute;
  max-height: 60%;
  width: calc(96% - 2px);
  margin: 0 0 0 2%;
  border: 2px solid #000;
}

::v-deep .van-icon-success:before {
  margin-left: -20px;
  content: '\e728';
}
</style>
