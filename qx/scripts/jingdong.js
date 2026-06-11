// const rsp = require('../debug.json');
// let url = 'functionId=welcomeHome';
let url = $request.url;
let rsp = JSON.parse($response.body);
if (url.includes("functionId=personinfoBusiness")) {
    console.log('-个人页清理');
    let final_list = []
    for (let item of rsp.floors) {
        if (item.data?.walletList) {
            // 白条
            continue;
        } else if (item.data?.nodes) {
            // 最下方工具
            continue;
        }
        final_list.push(item);
    }
    rsp.floors = final_list;
} else if (url.includes("functionId=welcomeHome")) {
    console.log('-欢迎页清理');
    let final_list = []
    for (let item of rsp.floorList) {
        if (item.iconText) {
            // 搜索栏上方消费券
            continue;
        }
        final_list.push(item);
    }
    rsp.floorList = final_list;
} else if (url.includes("functionId=wareBusiness")) {
    console.log('-商品直播');
    let final_list = []
    for (let item of rsp.floors) {
        if (item.data?.liveInfo) {
            item.data.liveInfo = {}
        }
        final_list.push(item);
    }
    rsp.floorList = final_list
} else if (url.includes("functionId=search")) {
    console.log('-AI导购');
    rsp.guideShopping = {}
    console.log('-检索直播中')
    let final_list = []
    for (let item of rsp.wareInfo) {
        if (item.configDatas?.shopBefore && item.configDatas.shopBefore.length > 0) {
            if (item.configDatas.shopBefore[0].describe == "直播中") {
                item.configDatas.shopBefore = []
            }
        }
        final_list.push(item);
    }
    rsp.floorList = final_list
}
$done(JSON.stringify(rsp));
