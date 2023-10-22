// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: orange; icon-glyph: broadcast-tower;
const canali = {
   1:{n:'Rai 1', p:'rai', i:'', u:''},
   2:{n:'Rai 2', p:'rai', i:'', u:''},
   3:{n:'Rai 3', p:'rai', i:'', u:''},
   4:{n:'Rete 4', p:'mediaset', i:'', u:''},
   5:{n:'Canale 5', p:'mediaset', i:'', u:''},
   6:{n:'Italia 1', p:'mediaset', i:'', u:''},
   8:{n:'TV8', p:'sky', i:'https://advertisingmanager.sky.it/assets/images/solutions/addressable-tv/logo_tv8_bianco.png', u:''},
  20:{n:'20', p:'mediaset', i:'', u:''},
  21:{n:'Rai 4', p:'rai', i:'', u:''},
  22:{n:'Iris', p:'mediaset', i:'', u:''},
  24:{n:'Rai Movie', p:'rai', i:'', u:''},
  25:{n:'Rai Premium', p:'rai', i:'', u:''},
  26:{n:'Cielo', p:'sky', i:'https://advertisingmanager.sky.it/assets/images/solutions/addressable-tv/logo_cielo_bianco.png', u:''},
  27:{n:'27 Twentyseven', p:'mediaset', i:'', u:''},
  30:{n:'La 5', p:'mediaset', i:'', u:''},
  34:{n:'Cine34', p:'mediaset', i:'', u:''},
  35:{n:'Focus', p:'mediaset', i:'', u:''},
  39:{n:'Top Crime', p:'mediaset', i:'', u:''},
  49:{n:'Italia 2', p:'mediaset', i:'', u:''},
  55:{n:'Mediaset Extra', p:'mediaset', i:'', u:''}
}
const apiRai = 'https://www.rai.it/dl/RaiPlay/2016/PublishingBlock-9a2ff311-fcf0-4539-8f8f-c4fee2a71d58.html?json'
const apiMed = 'https://feed.entertainment.tv.theplatform.eu/f/PR1GhC/mediaset-prod-all-stations?fields=title,thumbnails,tuningInstruction'
const apiSky = 'https://apid.sky.it/vdp/v1/getLivestream?id=#'
const table = new UITable()
const appPath = module.filename
const htmPath = appPath.substr( 0, appPath.lastIndexOf( '.' ) ) + '.html'
const webview = new WebView()
await webview.loadFile( htmPath )
raiSet( await ( new Request( apiRai ) ).loadJSON() )
mediaSet( await ( new Request( apiMed ) ).loadJSON() )
editTable( canali )
table.present()
console.log(canali)
Script.complete()
// Handle table populating starting from json dict
function editTable( obj ) {
  for ( let lcn of Object.values( canali ) ) {
    let setUrl = `v=document.querySelector('video');v.src=${"'"+lcn.u+"'"};v.addEventListener('loadedmetadata',v.play());`
    let row = new UITableRow()
    let imageCell = row.addImageAtURL( lcn.i )
    let titleCell = row.addText( lcn.n )
    imageCell.widthWeight = 10
    titleCell.widthWeight = 90
    titleCell.titleColor = Color.white()
    row.backgroundColor = Color.darkGray()
    row.height = 80
    row.cellSpacing = 10
    row.onSelect = async () => {
      // Sky urls expire so they need to be updated
      if ( lcn.n === 'TV8' || lcn.n === 'Cielo') {
          setUrl = `v=document.querySelector('video');v.src=${"'"+await skySet(lcn)+"'"};v.addEventListener('loadedmetadata',v.play());`
        }
      webview.evaluateJavaScript( setUrl )
      webview.present()
    }
    row.dismissOnSelect = false
    table.addRow( row )
  }
}
// Update canali dict adding rai streaming and icon
function raiSet( obj ) {
  for ( let diretta of obj.dirette ) {
    for (let lcn of Object.values( canali )) {
      if (lcn.n === diretta.channel) {
        lcn.u = diretta.video.contentUrl + '&output=16'
        lcn.i = diretta['transparent-icon'].replace('[RESOLUTION]', '320x-')
      }
    }
  }
}
// Update canali dict adding mediaset streaming and icon
function mediaSet( obj ) {
  for ( let entry of obj.entries ) {
    for ( let lcn of Object.values( canali ) ) {
      if ( lcn.n === entry['title'] ) {
        lcn.i = entry['thumbnails']['channel_logo-100x100']['url']
        for (var id of entry['tuningInstruction']['urn:theplatform:tv:location:any']) {
          if (id['format'] === 'application/x-mpegURL' && id['assetTypes'].includes('geoIT')) {
            lcn.u = id['publicUrls'][0]
          }
        }
      }
    }
  }
}
// Update sky urls cause they expire
async function skySet ( lcn ) {
  return lcn.n === 'TV8' ? ( await ( new Request( apiSky.replace( '#', '7' ) ) ).loadJSON() ).streaming_url
                         : ( await ( new Request( apiSky.replace( '#', '2' ) ) ).loadJSON() ).streaming_url
}