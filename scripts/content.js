"use strict";

start()

function start() {
    window.onload = async () => {
        if (window.location.hostname === "www.youtube.com") {
            console.log("get into youtube...")
            await initYoutube()
        }
        if (window.location.hostname === "chat.openai.com") {
            {
                if (document.getElementsByTagName("textarea")[0]) {
                    if (window.location.search === "?ref=chatvideo") {
                        console.log("get into chatgpt...")

                        chrome.runtime.sendMessage({message: "getPrompt"}, async (response) => {
                            document.getElementsByTagName("textarea")[0].focus()
                            // console.log(response.prompt)
                            copyTextToClipboard(response.prompt)
                            // document.getElementsByTagName("textarea")[0].value = response.prompt

                            let counter = 0
                            let input = setInterval(() => {
                                document.getElementsByTagName("textarea")[0].value = response.prompt
                                document.getElementsByTagName("button")[document.getElementsByTagName("button").length - 2].disabled = false
                                console.log("done")
                                document.getElementsByTagName("button")[document.getElementsByTagName("button").length - 2].click();
                                counter++
                                if (counter == 3) {
                                    clearInterval(input)
                                }
                            }, 1000)

                        })

                    }
                }
            }
        }
    }
}


async function initYoutube() {
    waitForElement("ytd-watch-flexy").then((res) => {
        initYoutubeBlock(document.getElementById("secondary-inner"))
    })
}


async function getLangOptionsWithLink(videoId) {
    const videoPageResponse = await fetch("https://www.youtube.com/watch?v=" + videoId);
    const videoPageHtml = await videoPageResponse.text();
    const splittedHtml = videoPageHtml.split('"captions":')

    if (splittedHtml.length < 2) {
        return;
    } // No Caption Available

    const captions_json = JSON.parse(splittedHtml[1].split(',"videoDetails')[0].replace('\n', ''));
    const captionTracks = captions_json.playerCaptionsTracklistRenderer.captionTracks;
    const languageOptions = Array.from(captionTracks).map(i => {
        return i.name.simpleText;
    })

    const first = "English"; // Sort by English first
    languageOptions.sort(function (x, y) {
        return x.includes(first) ? -1 : y.includes(first) ? 1 : 0;
    });
    languageOptions.sort(function (x, y) {
        return x == first ? -1 : y == first ? 1 : 0;
    });

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
            <p class="chapter_title">章节名称</p>
            <div style="display: flex; flex-direction: row; justify-content: space-between;">
                <button id="vyb-block-header-button-summary" >
                    Summary
                </button>
                <button id="block_wrap" class="title_item_wrap active" style="background: transparent;border: 0px;"/>
            </div>
            <div id="list_wrap">
                <p>123</p>
            </div>
    </div>
    `
    secondary.insertBefore(youtubeBlock, secondary.firstChild)


    const videoId = getPara(window.location.href).v
    let langOptionsWithLink = await getLangOptionsWithLink(videoId)
    if (langOptionsWithLink === undefined) {
        return;
    }

    let captions = await getCaptionsCollection(langOptionsWithLink)

    let summaryBut = document.getElementById("vyb-block-header-button-summary")
    summaryBut.addEventListener("click", e => {
        let prompt = getSummaryPrompt(aggregateCaptions(captions))
        console.log(prompt)
        chrome.runtime.sendMessage({message: "setPrompt", prompt: prompt});
        console.log("prompt sent it")
        setTimeout(() => {
            chrome.runtime.sendMessage({message: "setPrompt", prompt: prompt});
            window.open("https://chat.openai.com/chat?ref=chatvideo", "_blank")
        }, 500);

    })

    // 获取标题元素
    var block_wrap = document.getElementById('block_wrap')
    //给标题元素添加点击事件，通过点击控制class的添加&去除达成动画效果
}

function getSummaryPrompt(text) {
    return `Video Topic: ${document.title.replace(/\n+/g, " ")};
     Transcript: ${trucateCaptions(text).replace(/\n+/g, " ").trim()}}; Video Summary: `
}

//mention that gpt has char buffer limit
const gptBuffer = 13000

function trucateCaptions(transcript) {
    if (transcript.length > gptBuffer) {
        return transcript.substring(0, 13000)
    }
    return transcript
}

function aggregateCaptions(captions) {
    let str = ""
    captions.forEach((a) => str += a.innerHTML + "")
    return str;
}

//according to
function copyTextToClipboard(text) {

    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(text);
        return;
    } else {
        navigator.clipboard.writeText(text).then(function () {
        }, function (err) {
        });
    }

    function fallbackCopyTextToClipboard(text) {
        var textArea = document.createElement("textarea");
        textArea.value = text;

        // Avoid scrolling to bottom
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            var successful = document.execCommand('copy');
            var msg = successful ? 'successful' : 'unsuccessful';
        } catch (err) {
        }

        document.body.removeChild(textArea);
    }
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
