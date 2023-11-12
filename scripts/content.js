

start()
async function start() {
    if(window.location.hostname === "www.youtube.com") {
        console.log("get into youtube...")
        await initYoutube()
    } else {

    }

}

async function initYoutube() {


    waitForElement("ytd-watch-flexy").then((res) => {

        initYoutubeBlock(document.getElementById("secondary-inner"))
    })

    const videoId = getPara(window.location.href).v
    let langOptionsWithLink = await getLangOptionsWithLink(videoId)
    if (langOptionsWithLink === undefined) {
        return;
    }

    let captions = await getCaptionsCollection(langOptionsWithLink)

    let summaryBut = document.getElementById("vyb-block-header-button-summary")
    summaryBut.addEventListener("click", e => {
        aggregateCaptions(captions)
        window.open("https://chat.openai.com/", "_blank")
    })

}


async function getLangOptionsWithLink(videoId) {
    const videoPageResponse = await fetch("https://www.youtube.com/watch?v=" + videoId);
    const videoPageHtml = await videoPageResponse.text();
    const splittedHtml = videoPageHtml.split('"captions":')

    if (splittedHtml.length < 2) { return; } // No Caption Available

    const captions_json = JSON.parse(splittedHtml[1].split(',"videoDetails')[0].replace('\n', ''));
    const captionTracks = captions_json.playerCaptionsTracklistRenderer.captionTracks;
    const languageOptions = Array.from(captionTracks).map(i => { return i.name.simpleText; })

    const first = "English"; // Sort by English first
    languageOptions.sort(function (x, y) { return x.includes(first) ? -1 : y.includes(first) ? 1 : 0; });
    languageOptions.sort(function (x, y) { return x == first ? -1 : y == first ? 1 : 0; });

    return Array.from(languageOptions).map((langName, index) => {
        const link = captionTracks.find(i => i.name.simpleText === langName).baseUrl;
        return {
            language: langName,
            link: link
        }
    })
}
async function getCaptionsCollection(langOptionsWithLink) {
    let captionsResponse = await fetch(langOptionsWithLink[0].link)
    if (!captionsResponse.ok) {
        throw new Error(`HTTP error! status: ${captionsResponse.status}`)
    }
    let parser = new DOMParser()
    let captionsXML = await captionsResponse.text()
    captionsXML = parser.parseFromString(captionsXML, "text/xml")
    let captionsCollections = captionsXML.getElementsByTagName("text")
    return Array.from(captionsCollections)
}
function getPara(str) {
    let urlObj = new URL(str);
    let paramObj = {};
    urlObj.searchParams.forEach((val, key) => {
        paramObj[key] = val + ""
    })
    return paramObj
}

async function initYoutubeBlock(secondary) {

    var youtubeBlock = document.createElement("div")
    youtubeBlock.id = "video-youtube-block-container"

    youtubeBlock.innerHTML = `
	<div class="block_wrap" style="">
            
              <p class="chapter_title">AI summary</p>
            
            <div style="display: flex; flex-direction: row; justify-content: space-between;">
               <button id="vyb-block-header-button-summary" style="background: greenyellow; 
               border: 0px; 
               width: 75px; 
               height: 25px; 
               margin-top: 25px;
               margin-left: 10px;
               margin-bottom: 10px;
               box-sizing: border-box;">
                    Summary
                </button>
                <button id="block_wrap" class="title_item_wrap active" style="background: transparent;border: 0px;"/>
                <hr class="dashed">
            </div>
            <div id="list_wrap" class="node_wrap node_wrap_show">
                
            </div>
    </div>
    `


    secondary.insertBefore(youtubeBlock, secondary.firstChild)


    // 获取标题元素
    var block_wrap = document.getElementById('block_wrap')
    block_wrap.classList.remove('active')
    console.log(block_wrap)

    const videoId = getPara(window.location.href).v
    let langOptionsWithLink = await getLangOptionsWithLink(videoId)
    console.log(langOptionsWithLink)
    let captions = await getCaptionsCollection(langOptionsWithLink)


    const textContents = captions.map(element => element.textContent);
    captions[0].attributes

    // 为按钮添加点击事件处理函数
    block_wrap.onclick = function() {
        let list_wrap = document.getElementById('list_wrap')
        let classArray = this.className.split(/\s+/)
        if (classArray.includes('active')) {
            console.log('内容为空')
            block_wrap.classList.remove('active')
            list_wrap.classList.remove('node_wrap_show')
            list_wrap.classList.add('node_wrap_hide')
            console.log(this.className.split(/\s+/))
            return
        } else {
            console.log('内容不为空')
            // 清空 list_wrap 内容
            list_wrap.innerHTML = '';

            // 遍历 textContents 数组


            let container = document.createElement("div")
            container.style = "display: flex;\n" +
                "    flex-direction: row;\n" +
                "    flex-wrap: nowrap;\n" +
                "    justify-content: space-between;"

            let content = ""
            let n = 1
            captions.forEach(function(text) {
                let temp = parseFloat(text.getAttribute("start"));
                let pTime = document.createElement("a");
                // console.log(temp);
                pTime.className = "ytb-ptime"
                pTime.innerHTML = secondsToMinutes(temp)
                pTime.href = "https://youtu.be/" +  + "?t=" + temp
                // 为每个文本创建新的 <p> 元素
                let pElement = document.createElement("p");
                pElement.className = "ytb-pelement"
                if(temp <= 50*n){
                    if(content == "") {
                        console.log(pTime)
                        console.log("asdadsa")
                        container.appendChild(pTime)
                    }
                    content += text.textContent + " "
                }else{
                    n += 1
                    content += text.textContent + " "
                    pElement.textContent = content;
                    container.appendChild(pElement)
                    list_wrap.appendChild(container);
                    content = ""
                    container = document.createElement("div")
                    container.style = "display: flex;\n" +
                        "    flex-direction: row;\n" +
                        "    flex-wrap: nowrap;\n" +
                        "    justify-content: space-between;"
                }
                if(captions.indexOf(text) == captions.length - 1){

                    pElement.textContent = content;
                    container.appendChild(pElement)
                    list_wrap.appendChild(container);
                }
            });

            block_wrap.classList.add('active')
            list_wrap.classList.add('node_wrap_show')
            list_wrap.classList.remove('node_wrap_hide')
            return
        }

    };
}

function secondsToMinutes(seconds) {
    const minutes = Math.floor(seconds / 60);
    let remainingSeconds = Math.floor(seconds % 60);
    remainingSeconds = remainingSeconds < 10 ? "0" + remainingSeconds : remainingSeconds

    return `${minutes}:${remainingSeconds}`;
}
function aggregateCaptions(captions) {
    let str = ""
    captions.forEach((a) => str += a.innerHTML + "")
    // TODO clipboard need to fix it
    if(navigator.clipboard) {

       console.log(navigator.clipboard)
    }
    window.navigator.clipboard.writeText("asdasd")
        .then(() => {
            console.log("Text copied to clipboard successfully!");
        })
        .catch(err => {
            console.error("Failed to copy text: ", err);
        });

}

function waitForElement(selector) {
    return new Promise(resolve => {
        // Check if the element already exists
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        // If the element doesn't exist, set up a MutationObserver to watch for changes
        const observer = new MutationObserver(mutations => {
            // Check if the element now exists
            if (document.querySelector(selector)) {
                // Resolve the promise with the element
                resolve(document.querySelector(selector));
                // Disconnect the observer to stop watching for changes
                observer.disconnect();
            }
        });

        // Start observing the body for changes (childList and subtree)
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}
