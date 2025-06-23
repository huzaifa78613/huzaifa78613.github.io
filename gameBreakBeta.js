var imported = document.createElement('script');
var HostId = "ca-host-pub-6129580795478709"

var AdsenseId = "ca-pub-6792558303781780"
// Enter your AdSense ID. If you don't have an AdSense ID, leave this line unchanged and enter the Channel ID below.

var ChannelId = "123456";
// Enter your Channel ID if you don't have an AdSense ID.

var adFrequency = "180s";

var testAdsOn = false;
// Set to false when the game is ready to go live.

var activateAFP = true;
// Set to false if you are using the Channel ID instead of your AdSense ID.

window.adsbygoogle = window.adsbygoogle || [];
const adBreak = adConfig = function(o) {adsbygoogle.push(o);}
adConfig({
    preloadAdBreaks: 'on',
    sound: 'on', // This game has sound
    onReady: () => {
        console.log("ready");
    }, // Called when API has initialised and adBreak() is ready
});

function nextAds()
{
    console.log("showNextAd")
    adBreak({
        type: 'start', // ad shows at start of next level
        name: 'start-game',
        beforeAd: () => {            
            console.log("beforeAd")
			pauseGame();
        }, 
        afterAd: () => {
            console.log("afterAd")
			resumeGame();
        }, 
        adBreakDone: (placementInfo) => {
            console.log("adBreak complete ");
            console.log(placementInfo.breakType);
            console.log(placementInfo.breakName);
            console.log(placementInfo.breakFormat);
            console.log(placementInfo.breakStatus);
			resumeGame();
        },
    });
}

function showReward()
{
    console.log("showReward")
    adBreak({
        type: 'reward', 
        name: 'rewarded Ad',
        beforeAd: () => {            
            console.log("beforeAd")
			pauseGame();
        }, 
        afterAd: () => {
            console.log("afterAd")
			resumeGame();
        }, 
        beforeReward: (showAdFn) => {console.log("beforeReward ")+showAdFn(0)},
        adDismissed: () => {console.log("adDismissed");rewardAdsCanceled();},
        adViewed: () => {console.log("adViewed");rewardAdsCompleted();},
        adBreakDone: (placementInfo) => {
            console.log("adBreak complete ");
            console.log(placementInfo.breakType);
            console.log(placementInfo.breakName);
            console.log(placementInfo.breakFormat);
            console.log(placementInfo.breakStatus);
            if(placementInfo.breakStatus == "frequencyCapped"){NoRewardedAdsTryLater()};
			if(placementInfo.breakStatus == "other"){NoRewardedAdsTryLater()};
			resumeGame();
        },
    });
}

function pauseGame()
{
	console.log("pauseGame");
}

function resumeGame()
{
	console.log("resumeGame");
}

function rewardAdsCanceled()
		
{
	console.log("rewardAdsCanceled")
	// User clicked the close button when reward is showing. So just restart the game with no rewards.
}

function rewardAdsCompleted()
{
	console.log("RewardGained")
	// User watched the rewarded ad. so add rewards function here.
}


function NoRewardedAdsTryLater()
{
    console.log("NoRewardedAdsTryLater")
    // User Clicked the rewarded ad, but there is no rewarded ads available in server. 
}

function createAFGScript()
{
	console.log("createAFGScript")
	if(activateAFP == true){imported.setAttribute('data-ad-host', HostId)};
    imported.setAttribute('data-ad-client', AdsenseId);
	if(activateAFP == false){imported.setAttribute('data-ad-channel', ChannelId)};
    imported.setAttribute('data-ad-frequency-hint', adFrequency);
    if(testAdsOn == true){imported.setAttribute('data-adbreak-test', "on");}
    imported.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
    imported.setAttribute("type", "text/javascript");
    imported.async = true;
    document.head.appendChild(imported);
}

createAFGScript()

