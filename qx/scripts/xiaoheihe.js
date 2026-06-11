let url = $request.url;
let rsp = JSON.parse($response.body);
if (url.includes('bbs/app/feeds/banner')) {
    console.log('-首页Banner')
    rsp.result.ads_banner = [];
} else if (url.includes('game/all_recommend/v2')) {
    console.log('-游戏库Banner')
    let temp_list = rsp.result.all_list
    rsp.result.all_list = temp_list.filter(item => item.type !== "header")
}
$done(JSON.stringify(rsp));
