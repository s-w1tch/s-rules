// let rsp = require('../debug.json');
// let headers = {
//     'X-APOLLO-OPERATION-NAME': 'SubredditFeedSdui'
// };
let headers = $request.headers;
let rsp = JSON.parse($response.body);
switch (headers['X-APOLLO-OPERATION-NAME']) {
    case 'PdpCommentsAds':
        console.log('-评论区广告')
        rsp = {};
        break;
    // case 'HomeFeedSdui':
    //     console.log('-首页广告')
    //     let temp_list = rsp.data.homeV3.elements.edges
    //     rsp.data.homeV3.elements.edges = temp_list.filter(item => item.node?.adPayload === null)
    //     break;
    // case 'SubredditFeedSdui':
    //     console.log('-社区页广告')
    //     let temp_list = rsp.data.subredditV3.elements.edges
    //     rsp.data.subredditV3.elements.edges = temp_list.filter(item => item.node?.adPayload === null)
    //     break;
    default:
        if (rsp.data && typeof rsp.data === 'object' && !Array.isArray(rsp.data)) {
            for (let key of Object.keys(rsp.data)) {
                if (rsp.data[key].elements?.edges) {
                    console.log(`-${key}广告`)
                    let temp_list = rsp.data[key].elements.edges;
                    rsp.data[key].elements.edges = temp_list.filter(item => item.node?.adPayload === null);
                }
            }
        }
        break;
}
$done(JSON.stringify(rsp));