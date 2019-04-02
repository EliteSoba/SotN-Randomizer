let downloadReady
let selectedFile

function disableDownload() {
  downloadReady = false
  delete download.download
  delete download.href
}

function hideLoader() {
  loader.style.visibility = 'hidden'
}

function showLoader() {
  loader.style.visibility = 'visible'
}

function resetState() {
  target.className = ''
  target.innerHTML = 'Drop .bin file here'
  target.className = ''
  selectedFile = undefined
  randomize.disabled = true
  disableDownload()
  hideLoader()
}

function changeHandler() {
  disableDownload()
}

function dragLeaveListener(event) {
  target.className = ''
}

function dragOverListener(event) {
  event.preventDefault()
  event.stopPropagation()
  event.dataTransfer.dropEffect = 'copy'
  target.className = 'active'
}

function dropListener(event) {
  event.preventDefault()
  event.stopPropagation()
  resetState()
  if (event.dataTransfer.items) {
    for (let i = 0; i < event.dataTransfer.items.length; i++) {
      const item = event.dataTransfer.items[i]
      if (item.kind === 'file') {
        const file = item.getAsFile()
        selectedFile = file
      }
    }
  } else {
    for (let i = 0; i < event.dataTransfer.files.length; i++) {
      const file = event.dataTransfer.files[i]
      selectedFile = file
    }
  }
  if (selectedFile) {
    target.className = 'active'
    target.innerHTML = 'Ready to randomize'
    randomize.disabled = false
  }
}

function submitListener(event) {
  event.preventDefault()
  event.stopPropagation()
  disableDownload()
  showLoader()
  let seedValue = (new Date()).getTime()
  if (seed.value.length) {
    seedValue = seed.value
  }
  Math.seedrandom(seedValue)
  const reader = new FileReader()
  reader.addEventListener('load', function() {
    try {
      const data = reader.result
      const array = new Uint8Array(data)
      const options = {
        randomizeStartingEquipment: startingEquipment.checked,
        randomizeEquipmentLocations: equipmentLocations.checked,
      }
      randomizeEquipment(array, options)
      if (relics.checked) {
        randomizeRelics(array)
      }
      // Recalc edc
      eccEdcCalc(array)
      const url = URL.createObjectURL(new Blob([ data ], { type: 'application/octet-binary' }))
      const lastPeriodIdx = selectedFile.name.lastIndexOf('.')
      const insertIdx = lastPeriodIdx === -1 ? selectedFile.name.length : lastPeriodIdx
      const randomizedFileName = [
        selectedFile.name.slice(0, insertIdx),
        ' (' + seedValue + ')',
        selectedFile.name.slice(insertIdx),
      ].join('')
      download.download = randomizedFileName
      download.href = url
      download.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      target.className = 'error'
      target.innerHTML = 'Error'
      throw e
    }
  }, false)
  const file = reader.readAsArrayBuffer(selectedFile)
}

const body = document.getElementsByTagName('body')[0]
body.addEventListener('dragover', dragOverListener, false)
body.addEventListener('dragleave', dragLeaveListener, false)
body.addEventListener('drop', dropListener, false)

const target = document.getElementById('target')

const form = document.getElementById('form')
form.addEventListener('submit', submitListener, false)

const randomize = form.elements['randomize']

const seed = form.elements['seed']
seed.addEventListener('change', changeHandler, false)

const relics = form.elements['relics']
const startingEquipment = form.elements['starting-equipment']
const equipmentLocations = form.elements['equipment-locations']

const download = document.getElementById('download')

const loader = document.getElementById('loader')

resetState()
