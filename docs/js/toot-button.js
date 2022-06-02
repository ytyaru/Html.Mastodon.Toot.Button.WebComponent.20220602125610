class TootButton extends HTMLElement {
    constructor(domain) {
        super();
        this.domain = domain
        this.imgSrc = null
        this.imgSize = '64'
        this.title = 'トゥートする'
        this.okMsg = 'トゥートしました！'
        this.ngMsg = 'キャンセルしました。'
        this.#redirectCallback()
    }
    static get observedAttributes() {
        return ['domain', 'img-src', 'img-size', 'title', 'ok-msg', 'ng-msg'];
    }
    async connectedCallback() {
        //const shadow = this.attachShadow({ mode: 'closed' });
        const shadow = this.attachShadow({ mode: 'open' }); // マウスイベント登録に必要だった。CSS的にはclosedにしたいのに。
        const button = await this.#make()
        //await this.#makeClickEvent()
        console.debug(button.innerHTML)
        shadow.innerHTML = `<style>${this.#cssBase()}${this.#cssAnimation()}</style>${button.innerHTML}` 
        // pointer系 = mouse系 + touch系 + pen系
        this.shadowRoot.querySelector('img').addEventListener('pointerdown', (e)=>{ e.target.classList.add('jump'); }, false);
        //this.shadowRoot.querySelector('img').addEventListener('pointerover', (e)=>{ e.target.classList.add('flip'); }, false);
        //this.shadowRoot.querySelector('img').addEventListener('mouseover', (e)=>{ e.target.classList.add('flip'); }, false);
        this.shadowRoot.querySelector('img').addEventListener('animationend', (e)=>{ e.target.classList.remove('jump'); e.target.classList.remove('flip'); }, false);

        this.#addListenerEvent()
        /*
        for (const button of document.querySelectorAll(`.toot-button`)) {
            setTootButton(button)
        }
        */
    }
    #cssBase() { return `img{cursor:pointer; text-align:center; vertical-align:middle; user-select:none;}` }
    #cssAnimation() { return `
@keyframes jump {
  from {
    position:relative;
    bottom:0;
    transform: rotateY(0);
  }
  45% {
    position:relative;
    bottom: ${this.imgSize*2}px;
  }
  55% {
    position:relative;
    bottom: ${this.imgSize*2}px;
  }
  to {
    position:relative;
    bottom: 0;
    transform: rotateY(720deg);
  }
}
.jump {
  transform-origin: 50% 50%;
  animation: jump .5s linear alternate;
}
@keyframes flip {
  from {
    transform: rotateY(0);
  }
  to {
    transform: rotateY(180deg);
  }
}
.flip {
  transform-origin: 50% 50%;
  animation: flip .20s linear alternate;
}`; }
    attributeChangedCallback(property, oldValue, newValue) {
        if (oldValue === newValue) { return; }
        if ('img-src' === property) { this.imgSrc = newValue}
        else if ('img-size' === property) { this.imgSize = newValue}
        else if ('ok-msg' === property) { this.okMsg = newValue}
        else if ('ng-msg' === property) { this.ngMsg = newValue}
        else { this[property] = newValue; }
    }
    async #redirectCallback() { // 認証したあとに戻ってきたらトゥートする
        const url = new URL(location.href)
        // マストドンAPI oauth/authorize でリダイレクトされた場合
        if (url.searchParams.has('code') && url.searchParams.get('domain')) {
            const domain = url.searchParams.get('domain') // mstdn.jp, pawoo.net, ...
            const tooter = new Tooter(domain)
            const code = url.searchParams.get('code')
            // 認証コード(code)をURLパラメータから削除する
            const params = url.searchParams;
            params.delete('code');
            history.replaceState('', '', url.pathname);
            // トークンを取得して有効であることを確認しトゥートする
            const status = sessionStorage.getItem(`status`)
            console.debug('----- authorized -----')
            console.debug('client_id:', sessionStorage.getItem(`${domain}-client_id`))
            console.debug('client_secret:', sessionStorage.getItem(`${domain}-client_secret`))
            console.debug('認証コード', code)
            // client_id, client_secretはsessionStorageに保存しておく必要がある
            const json = await tooter.getToken(sessionStorage.getItem(`${domain}-client_id`), sessionStorage.getItem(`${domain}-client_secret`), code)
            console.debug(json)
            console.debug('access_token:', json.access_token)
            sessionStorage.setItem(`${domain}-access_token`, json.access_token);
            const accessToken = json.access_token
            const v = await tooter.verify(accessToken)
            console.debug(v)
            const res = await tooter.toot(accessToken)
            console.debug(res)
            document.getElementById('res').value = JSON.stringify(res)
            sessionStorage.removeItem(`status`)
            console.debug('----- 以上 -----')
        }
    }
    async #make() {
        const a = await this.#makeSendButtonA()
        const img = this.#makeSendButtonImg()
        a.appendChild(img)
        return a
    }
    #makeSendButtonA() {
        const a = document.createElement('a')
        a.setAttribute('title', this.title)
        a.setAttribute('class', `vov swivel-horizontal-double`) // アニメーション用
        return a
    }
    #makeSendButtonImg() {
        const img = document.createElement('img')
        const size = this.#parseImgSize()
        const [width, height] = this.#parseImgSize()
        img.setAttribute('width', `${width}`)
        img.setAttribute('height', `${height}`)
        img.setAttribute('src', `${this.#getImgSrc()}`)
        //img.classList.add('flip'); // 初回アニメーション用
        return img
    }
    #getImgWidth() { return parseInt( (0 <= this.imgSize.indexOf('x')) ? this.imgSize.split('x')[0] : this.imgSize) }
    #getImgHeight() { return parseInt( (0 <= this.imgSize.indexOf('x')) ? this.imgSize.split('x')[1] : this.imgSize) }
    #parseImgSize() {
        if (0 <= this.imgSize.indexOf('x')) { return this.imgSize.split('x').map(v=>(parseInt(v)) ? parseInt(v) : 64) }
        else { return (parseInt(this.imgSize)) ? [parseInt(this.imgSize), parseInt(this.imgSize)] : [64, 64] }
    }
    #getImgSrc() {
        console.log(this.domain, this.imgSize)
        if (this.imgSrc) { return this.imgSrc }
        //return `http://www.google.com/s2/favicons?domain=${this.domain}`
        if (this.domain) { return `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${this.domain}&size=${this.imgSize}` }
        return `./asset/image/mastodon_mascot.svg`
        /*
        if (this.imgSrc) { return this.imgSrc }
        if (this.img) {
            const num = parseInt(this.img)
            if (isNaN(num)) {
                const key = this.icon.getKey(this.img, this.imgSize)
                return (this.icon.Base64.has(key)) ? this.icon.Base64.get(key) : this.icon.Default }
            else {
                if (this.icon.Base64.size <= num) { return this.icon.Default }
                if (num < this.icon.Base64.size) { return [...this.icon.Base64.values()][num] }
                return this.icon.get(this.img, this.imgSize)
            }
        }
        return this.icon.Default
        */
    }
    #addListenerEvent() { // トゥートボタンを押したときの動作を実装する
        this.addEventListener('click', async(event) => {
            console.log('クリック')
            const domain = (this.domain) ? this.domain : this.#getDomain()
            console.log(domain)
            const tooter = new Tooter(domain)
            const access_token = sessionStorage.getItem(`${domain}-access_token`)
            if (access_token && tooter.verify(access_token)) {
                console.debug('既存のトークンが有効なため即座にトゥートします。');
                const res = await tooter.toot(access_token)
                console.debug(res)
                document.getElementById('res').value = JSON.stringify(res)
            } else {
                console.debug('既存のトークンがないか無効のため、新しいアクセストークンを発行します。');
                const app = await tooter.createApp().catch(e=>alert(e))
                console.debug(app)
                console.debug(app.client_id)
                console.debug(app.client_secret)
                console.debug(sessionStorage.getItem(`${domain}-client_id`))
                console.debug(sessionStorage.getItem(`${domain}-client_secret`))
                sessionStorage.setItem(`${domain}-client_id`, app.client_id);
                sessionStorage.setItem(`${domain}-client_secret`, app.client_secret);
                sessionStorage.setItem(`status`, document.getElementById('status').value);
                tooter.authorize(app.client_id)
            }
        });
    }
    #getDomain() {
        const domain = window.prompt('ドメイン名を入力してください。');
        try { return new URL(domain).hostname }
        catch (e) { return domain }
    }
    #isExistInstance() {
        // 入力したドメインが存在するか（リンク切れでないか）
        // 入力したドメインはマストドンのインスタンスか（どうやってそれを判定するか）
        return true
    }
}
window.addEventListener('DOMContentLoaded', (event) => {
    customElements.define('toot-button', TootButton);
});

