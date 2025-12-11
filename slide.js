/**
 * slideshow.scss と連動
 */
const slide = {}

 // メソッド設定（タッチイベントに配慮）
 slide.is_touch = (('ontouchstart' in window && 'ontouchend' in window) || navigator.msPointerEnabled)
 slide.start = (slide.is_touch)? 'touchstart': 'mousedown'
 slide.move = (slide.is_touch)? 'touchmove': 'mousemove'
 slide.end = (slide.is_touch)? 'touchend': 'mouseup'
 slide.leave = (slide.is_touch)? 'touchleave': 'mouseleave'
 slide.is_session = (('sessionStorage' in window) && window['sessionStorage'] !== null)
 
 
 /**
  * セッションストレージの呼び出しと保存
  *
  * @param {string} n* key
  * @param {anything} v value vがない場合は、nの呼び出し
  * @return {anything} vがあるときはストレージの文字列、ない場合はnの値
  */
 slide.storage = (n, v) => {
   let r = null
   
   if (slide.is_session && typeof n !== 'undefined') {
     if (typeof v !== 'undefined') {
       if (typeof v === 'object') {
         sessionStorage[n] = JSON.stringify(v)
       } else {
         sessionStorage[n] = v
       }
     } else {
       try {
         r = (new Function("return " + sessionStorage[n]))()
 //        r = JSON.parse(sessionStorage[n])
       } catch (e) {
         r = sessionStorage[n]
       }
     }
   }
   return r
 }
 
 /**
  * セッションストレージ削除
  *
  * @param {string} n* セッションストレージのキー
  */
 slide.storageDel = (n) => {
   sessionStorage.removeItem(n)
 }
 
 /**
  * スライドショー
  *
  * @param (string) n: .slideshowに付与するclass/id e.g. .test1 or #test1
  * @param (object) obj
  * 
  * obj.interval (number|null|boolean(false)) スライドの間隔(ミリ秒)。nullもしくはfalseの場合はスライドショーは行わない
  * obj.no (number) 初期時に表示するスライド番号。初期は最初の「1」。
  * obj.t (object|null|boolean(false)) 外部リンクを有効にするときのトリガー object: jQuery e.g. $('.test')
  * obj.before (function|null|boolean(false)) スライド移動前に実行する関数
  * obj.after (function|null|boolean(false)) スライド移動後に実行する関数
  * obj.click (function|null|boolean(false)) スライド上をクリックした際に実行する関数
  * obj.is_keyboard (boolean|null) 左右のキーボードアクションを有効にするか
  */
 slide.show = (n = '.slideshow', obj = {}) => {
   const tgt = $(n),
         tgt_flex = $('.slideshow__flex', tgt),
         tgt_unit = $('.slideshow__unit', tgt),
         tgt_link = $('.js-slide-nav', tgt),
         _link = $('a', tgt_link),
         _link_out = (obj.t)? $('.js-slide-link', obj.t): $('.js-slide-link')
 
   const interval = (obj.interval || obj.interval === false)? obj.interval: 3000,        
         before_func = obj.before,
         after_func = obj.after,
         click_func = obj.click,
         is_keyboard = obj.is_keyboard
   
   let array_href = []
   
   let is_dragging,
       is_auto,
       is_reauto,
       anime_auto
 
   let slide_num = 0,
       slide_no = obj.no || 1
 
   let slide_pos_x,
       slide_pos_y,
       slide_pos_start_x,
       slide_pos_start_y,
       pos_scroll_x,
       pos_scroll_y,
       pos_scroll_x_diff,
       pos_scroll_y_diff,
       pos_left
 
   let w = tgt_unit.width()
 
   if (w === 0) {
     setTimeout(() => {
       w = tgt_unit.width()
     }, 1)
   }
   
   // 初期時に表示するスライド番号、セッションがある場合はそれを採用する
   if (slide.storage(n)) {
     slide_no = slide.storage(n)
     slide.storageDel(n)
   }
 
   /**
    * エリア切り替え
    */
   const slideChange = () => {
     const new_w = tgt_unit.width()
 
     if (before_func) before_func()
 
     if (new_w != 0) {
       w = new_w
     }    
     
     tgt_flex.stop().animate({
       left: w * (slide_no - 1) * (-1)
     }, () => {
       if (after_func) after_func()
     })
     
     slideSetNav()
   }
   
   /**
    * ナビ表示
    */
   const slideSetNav = () => {

    if (tgt_unit.length > 1) {
      tgt.attr('data-no', slide_no)
      
      if (_link.length > 0) {
        _link.removeClass('on')
        $('[data-nav="' + slide_no + '"]', tgt).addClass('on')
      }
    } else {
      tgt_link.remove()
    }    
   }  
   
   /**
    * ナンバー取得
    */
   const slideNo = (status) => {
     switch (status) {
       case 'next':
         slide_no = slide_no + 1
         if (slide_no > slide_num) {
           slide_no = 1
         }
         break;
         
       case 'prev':
         slide_no = slide_no - 1
         if (slide_no < 1) {
           slide_no = slide_num
         }
         break;
     }
   }
 
   /**
    * 手動切り替え
    */
   const slideManual = () => {
 
     /**
      * ドラッグ＆ドロップもしくはエリア外に移動後
      */
     const slideOut = () => {
       is_dragging = false
       
       // 一度手動にして、その後またオートにしたい場合
       if (is_reauto) clearTimeout(is_reauto)
       is_reauto = setTimeout(() => {
         if (!is_dragging && interval) {
           is_auto = true
         }
       }, interval)
     }
 
     /*
      * ドラッグ＆ドロップ処理
      *
      * ATTENSION:
      * tgt_flex をトリガーにしたいが、
      * iPhoneでエリア外でスライドできないバグがあるため、
      * 不本意だが tgt をトリガーとしている
      */
     tgt
     .on(slide.start, (e) => {
       is_dragging = false   
       is_auto = false
 
       slide_pos_x = (slide.is_touch)? e.touches[0].pageX: e.pageX
       slide_pos_y = (slide.is_touch)? e.touches[0].pageY: e.pageY
       slide_pos_start_x = slide_pos_x
       slide_pos_start_y = slide_pos_y
     })
     .on(slide.end, (e) => {
       pos_scroll_x_diff = slide_pos_start_x - pos_scroll_x
       pos_scroll_y_diff = slide_pos_start_y - pos_scroll_y
 
       if (!is_dragging) {
 
         if (click_func) click_func()
 
         if (array_href[slide_no - 1]) {
           slide.storage(n, slide_no)
           location.href = array_href[slide_no - 1]
         }
       } else {
         if (Math.abs(pos_scroll_y_diff) < 50) {
 
           if (pos_scroll_x_diff > 50) {            
             slideNo('next')
           } else if (pos_scroll_x_diff < -50) {
             slideNo('prev')
           }
           slideChange()
 
           e.preventDefault()          
         }
            
         slideOut()
       }
     })
     .on(slide.leave, slideOut)
     .on(slide.move, (e) => {
       
       // ドラッグ＆ドロップ中であるか常に監視する
       is_dragging = true
       pos_scroll_x = (slide.is_touch)? e.touches[0].pageX: e.pageX
       pos_scroll_y = (slide.is_touch)? e.touches[0].pageY: e.pageY
       
       pos_scroll_x_diff = slide_pos_start_x - pos_scroll_x
       pos_scroll_y_diff = slide_pos_start_y - pos_scroll_y
       
       if (Math.abs(pos_scroll_x_diff) > 50) {
           
         tgt_flex.css({
           left: pos_left - (slide_pos_x - pos_scroll_x)
         })
 
         slide_pos_x = pos_scroll_x
         
         e.preventDefault()
       }
     })
   }
 
   /**
    * 自動切り替え
    */
   const slideAuto = () => {  
     if (anime_auto) clearTimeout(anime_auto)
     anime_auto = setTimeout(() => {
       if (is_auto) {
         slideNo('next')
         slideChange()
       }    
       slideAuto()
     }, interval)
   }
 
   /**
    * キーボードによる切り替え
    */
   if (is_keyboard || $('.slideshow').length === 1) {
     document.addEventListener('keydown', (e) => {
       
       switch (e.key) {
         case 'ArrowLeft':
           if (interval) {
             slideAuto()
           }
           slideNo('prev')
           slideChange()
           break;
         case 'ArrowRight':
           if (interval) {
             slideAuto()
           }
           slideNo('next')
           slideChange()
           break;
 
         // default なし
       }
       return false
     })
   }
 
   
   /**
    *　リサイズ処理(幅情報を更新する)
    */
   $(window).on('resize', () => {
     w = tgt_unit.width()
     tgt_flex.css('left', w*(slide_no - 1)*(-1))
   })
   
   /*
    * リンク処理
    *
    * MEMO: アロー関数で記述すると、$(this)を認識しないので、無名関数で記述している
    */
   _link.on('click', function () {
     let val = $(this).attr('data-nav') || 'next'
     
     is_auto = false
     
     if (val === 'prev' || val === 'next') {
       slideNo(val)
     } else {
       slide_no = (+val)
     }
     
     slideChange()
     return false
   })
 
   
   // 外部からのリンク
   _link_out.on('click', function () {
     let val = $(this).attr('data-nav') || 'next'
     
     is_auto = false
     
     if (val === 'prev' || val === 'next') {
       slideNo(val)
     } else {
       slide_no = (+val)
     }
     
     slideChange()
     return false
   })
   
   /**
    * 初期処理
    */
   const init = () => {
     slide_num = tgt_unit.length
 
     // リンクがある場合に備え、配列に格納する
     tgt_unit.each(function () {
       const _this = $(this),
             href = _this.attr('data-href')
 
       if (href && href != '') {
         array_href.push(href)
       } else {
         array_href.push(null)
       }
     })
 
     // 初期表示
     tgt_flex.css('left', w*(slide_no - 1)*(-1))
     slideSetNav()
 
     // 手動スライド
     slideManual()
 
     // 自動スライド
     if (interval) {
       is_auto = true
       slideAuto()
     }
   }
   init()
 }
 