/*
 * 京东 iOS 15.8.30（com.360buy.jdmobile / 170515）广告与悬浮层清理（Quantumult X）
 *
 * 依据：170515 原包 Mach-O 真实键名与真实调用链：
 *   - 开屏：+[LaunchAnimationManagerHelper launchRequestModel] 设置 functionId=start，
 *     URL = promotionServerUrl + "start"（默认模板以 ?functionId= 结尾），POST 表单；
 *     响应顶层字段为 images（+[LaunchAnimationManagerHelper jdAdShowModelArray:]）。
 *   - 开屏缓存：-[LaunchAnimationManager localAdModelArray] 读取
 *     Library/Caches/adviewModePath/startViewModel_*.data，
 *     -[LaunchAnimationManager getStartImage:] 会直接播放缓存模型。
 *   - 悬浮/弹窗：commonPopup / commonPopup_dynamic / floatLayer / floatTopModels /
 *     tnEntryFloatView / marketingView / liveInfoAndProduct / miniLive / liveWindow 等。
 *   - 弹窗投放：functionId=resources_delivery（JDResoureBitManager 的 NXView 投放计划）。
 *
 * 只删除广告位、浮层、浮球、弹窗、直播小窗容器，保留商品、价格、购物车、订单、优惠券权益。
 * 明确的拦截与字段删除会写 console.log；解析失败或异常时原样放行。
 */

(function () {
const url = $request.url;
const body = $response.body;

function readFunctionId(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const match = value.match(/(?:^|[?&])functionId=([^&]*)/);
  if (match) {
    try {
      return decodeURIComponent(match[1].replace(/\+/g, ' '));
    } catch (error) {
      return '';
    }
  }
  try {
    const payload = JSON.parse(value);
    return payload && typeof payload.functionId === 'string' ? payload.functionId : '';
  } catch (error) {
    return '';
  }
}

// QX 官方文档只保证 script-response-body 提供 $request.url/$request.headers 等；
// $request.body 在部分版本可用，这里仅作为补充，不依赖它。
const functionId = readFunctionId(url) || readFunctionId($request.body);
const functionLabel = /^[A-Za-z0-9_-]{1,80}$/.test(functionId) ? functionId : '(unknown)';
const host = (url.match(/^https?:\/\/([A-Za-z0-9.-]+)(?=[:/?#]|$)/) || [])[1] || '(unknown)';
const DEBUG = true;
if (DEBUG) {
  console.log('[JD-Ads] INSPECT host=' + host + ' functionId=' + functionLabel);
}

// 广告专用接口：直接返回空对象，且不受响应体是否可解析影响。
// 这些拦截独立打日志，便于确认规则确实命中。
const AD_APIS = new Set([
  'start',                 // 开屏
  'resources_delivery',    // JDResoureBitManager NXView 投放计划
  'getShopHomeActivityInfo',
  'getShopHomeExtendInfo',
  'xview2Config'
]);
if (AD_APIS.has(functionId)) {
  const label = functionId === 'start' ? 'BLOCK-START'
    : functionId === 'resources_delivery' ? 'BLOCK-RESDELIVERY'
    : 'BLOCK-ADAPI';
  console.log('[JD-Ads] ' + label + ' host=' + host + ' functionId=' + functionLabel);
  $done({ body: '{}' });
  return;
}

if (!body) {
  $done({});
  return;
}

let data;
try {
  data = JSON.parse(body);
} catch (e) {
  console.log('[JD-Ads] JSON 解析失败，原样放行');
  $done({});
  return;
}

// 原包中确认存在的广告/浮层/弹窗字段。
const DROP_KEYS = new Set([
  // 广告位与素材
  'advertTitle', 'advertImg', 'adList', 'advGrpId', 'advertId',
  'advertGroup', 'advertGroupData', 'advertGroupId', 'advertGroupList', 'advertGroupResult',
  'materialData', 'adInfo', 'adInfos', 'adInfoFloorView', 'adInfoModel',
  // 注意：adModelsUsefull 属于订单取消原因模型，不能删
  'adModel', 'adModels', 'adItemArray',
  'advertiseChannel', 'advertiseRequest', 'advertiseView', 'advertisementData',
  'advertising', 'advertisingView', 'sugAdvertiseVO',
  // 首页浮球 / 浮层 / 悬浮（170515 仍存在：floatLayer/floatTopModels/floatTop/tnEntryFloatView）
  'floatTopModels', 'floatTop', 'floatLayerList', 'floats', 'floatLayer', 'floatList',
  'floatType', 'floatTypeNormal', 'floatTypeIs916',
  'floatView', 'floatWindow', 'floatBall', 'floatBallView', 'floatData',
  'floatingButton', 'floatingList', 'floatingView', 'floatingWidget', 'floatingFloor',
  'tnEntryFloatView', 'iconFloatModel', 'openLoginFloatModel',
  // 搜索框下营销条
  'marketingView', 'marketingInfo', 'marketingData', 'navMkt', 'navMktInfo', 'navMktModels',
  // 弹窗 / 挽留 / 补贴
  'commonPopup', 'commonPopup_dynamic', 'commonPopupInfo', 'indexPopup', 'indexPopupConfig',
  'platRetentionInfo', 'retentionRecommendInfo', 'subsidyPopupConfig', 'platCloseBottomRecommend',
  'popupInfo', 'popupInfoDic', 'popUpInfo', 'popupList', 'popupData', 'popupModel', 'popupModels',
  // 直播小窗
  'liveInfo', 'liveInfoList', 'liveInfoAndProduct', 'liveInfoModel',
  'miniLive', 'miniLiveWindow', 'liveWindow', 'liveSmallWindow',
  // 小时购
  'hourlyGoAD', 'hourlyGoAd', 'hourlyGoPopup', 'hourlyGoFloat',
  // 领券浮球 / 红包横幅（保留券数据本身）
  'couponBall', 'surpriseCouponLayer', 'redPacketBanner',
  // 开屏标记
  'launchAdFlag', 'launchAdShowTimes'
]);

// 明确的广告楼层类型，避免误删推荐、商品、活动等正常楼层。
const AD_FLOOR_TYPE = /(^|[^a-z])(ad|ads|advert|advertise|float|popup|popUp|mkt|marketing|banner|live|retention|subsidy)([^a-z]|$)/i;

let removed = 0;
let logged = 0;
const MAX_LOGS = 40;

function logOnce(message) {
  if (logged < MAX_LOGS) {
    console.log('[JD-Ads] ' + message);
    logged += 1;
  }
}

function scrub(node, path) {
  if (Array.isArray(node)) {
    node.forEach((item, index) => scrub(item, path + '[' + index + ']'));
    return;
  }
  if (!node || typeof node !== 'object') {
    return;
  }
  for (const key of Object.keys(node)) {
    if (DROP_KEYS.has(key)) {
      delete node[key];
      removed += 1;
      logOnce('删除字段 ' + path + '.' + key);
      continue;
    }
    scrub(node[key], path + '.' + key);
  }
}

function dropAdFloors(container) {
  for (const listKey of ['floors', 'floorList']) {
    const list = container[listKey];
    if (!Array.isArray(list)) {
      continue;
    }
    container[listKey] = list.filter((floor, index) => {
      if (!floor || typeof floor !== 'object') {
        return true;
      }
      const type = String(floor.type || floor.floorType || floor.templateType || '');
      if (AD_FLOOR_TYPE.test(type)) {
        removed += 1;
        logOnce('删除广告楼层 ' + listKey + '[' + index + '] type=' + type);
        return false;
      }
      const floorData = floor.data;
      if (floorData && typeof floorData === 'object' && !Array.isArray(floorData)) {
        const keys = Object.keys(floorData);
        if (keys.length > 0 && keys.every((key) => DROP_KEYS.has(key))) {
          removed += 1;
          logOnce('删除广告楼层 ' + listKey + '[' + index + '] 仅含广告字段');
          return false;
        }
      }
      return true;
    });
  }
}

try {
  scrub(data, '$');
  dropAdFloors(data);

  // 首页欢迎页：搜索框上方消费券楼层。
  if (functionId === 'welcomeHome' && Array.isArray(data.floorList)) {
    const before = data.floorList.length;
    data.floorList = data.floorList.filter((item) => !(item && item.iconText));
    if (data.floorList.length !== before) {
      removed += before - data.floorList.length;
      logOnce('删除欢迎页消费券楼层 ' + (before - data.floorList.length) + ' 个');
    }
  }

  // 搜索页：AI 导购与“直播中”标签。
  if (functionId === 'search') {
    if (data.guideShopping) {
      delete data.guideShopping;
      removed += 1;
      logOnce('删除搜索 AI 导购 guideShopping');
    }
    if (Array.isArray(data.wareInfo)) {
      for (const item of data.wareInfo) {
        const shopBefore = item && item.configDatas && item.configDatas.shopBefore;
        if (Array.isArray(shopBefore) && shopBefore[0] && shopBefore[0].describe === '直播中') {
          item.configDatas.shopBefore = [];
          removed += 1;
          logOnce('删除搜索商品直播中标签');
        }
      }
    }
  }

  // 商品详情：兼容旧版 liveInfo 字段。
  if (functionId === 'wareBusiness' && Array.isArray(data.floors)) {
    for (const floor of data.floors) {
      if (floor && floor.data && floor.data.liveInfo) {
        delete floor.data.liveInfo;
        removed += 1;
        logOnce('删除详情直播入口 liveInfo');
      }
    }
  }

  if (removed === 0) {
    // 没有命中广告字段时不改动响应，避免影响登录、支付等业务。
    if (DEBUG) {
      console.log('[JD-Ads] PASS functionId=' + functionLabel);
    }
    $done({});
    return;
  }
  console.log('[JD-Ads] 完成 ' + functionLabel + ' 共删除 ' + removed + ' 项');
} catch (e) {
  console.log('[JD-Ads] 清理异常，原样放行: ' + e);
  $done({});
  return;
}

$done({ body: JSON.stringify(data) });
})();
