/*
 * 京东 iOS 15.3.30 广告与悬浮层清理（Quantumult X）
 *
 * 依据：原包 Mach-O 真实键名与首页楼层路径（如 floors[refId=basefloorinfo].data.commonPopup /
 * commonPopup_dynamic / floatLayer），以及客户端 84 个广告补丁点覆盖的广告类型。
 * 只删除广告位、浮层、浮球、弹窗、直播小窗容器，保留商品、价格、购物车、订单、优惠券权益。
 * 每次命中都会写 console.log，可在 QX 日志中核对；解析失败或异常时原样放行。
 */

(function () {
const url = $request.url;
const body = $response.body;

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

const functionId = (url.match(/[?&]functionId=([^&]+)/) || [])[1] || '';

if (functionId === 'start') {
  console.log('[JD-Ads] 拦截开屏 functionId=start');
  $done({ body: '{}' });
  return;
}

console.log('[JD-Ads] 命中 functionId=' + functionId);

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
  // 首页浮球 / 浮层 / 悬浮
  'floatTopModels', 'floatLayerList', 'floats', 'floatLayer', 'floatList',
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

  console.log('[JD-Ads] 完成 ' + functionId + ' 共删除 ' + removed + ' 项');
} catch (e) {
  console.log('[JD-Ads] 清理异常，原样放行: ' + e);
  $done({});
  return;
}

$done({ body: JSON.stringify(data) });
})();
