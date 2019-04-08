let isBrowser = true

try {
  isBrowser = !module
} catch (e) {}

let downloadReady
let selectedFile

function disableDownload() {
  downloadReady = false
  delete elems.download.download
  delete elems.download.href
}

function hideLoader() {
  elems.loader.style.visibility = 'hidden'
}

function showLoader() {
  elems.loader.style.visibility = 'visible'
}

function resetState() {
  elems.target.className = ''
  elems.target.innerHTML = 'Drop .bin file here'
  elems.target.className = ''
  selectedFile = undefined
  elems.randomize.disabled = true
  disableDownload()
  hideLoader()
}

function changeHandler() {
  disableDownload()
}

function dragLeaveListener(event) {
  elems.target.className = ''
}

function dragOverListener(event) {
  event.preventDefault()
  event.stopPropagation()
  event.dataTransfer.dropEffect = 'copy'
  elems.target.className = 'active'
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
    elems.target.className = 'active'
    elems.target.innerHTML = 'Ready to randomize'
    elems.randomize.disabled = false
  }
}

function randomizedFilename(filename, seedValue) {
  const lastPeriodIdx = filename.lastIndexOf('.')
  const insertIdx = lastPeriodIdx === -1 ? filename.length : lastPeriodIdx
  return [
    filename.slice(0, insertIdx),
    ' (' + seedValue + ')',
    filename.slice(insertIdx),
  ].join('')
}

function submitListener(event) {
  event.preventDefault()
  event.stopPropagation()
  disableDownload()
  showLoader()
  let seedValue = (new Date()).getTime().toString()
  if (elems.seed.value.length) {
    seedValue = elems.seed.value
  }
  Math.seedrandom(seedValue)
  const reader = new FileReader()
  reader.addEventListener('load', function() {
    try {
      const data = reader.result
      const array = new Uint8Array(data)
      const options = {
        startingEquipment: elems.startingEquipment.checked,
        equipmentLocations: elems.equipmentLocations.checked,
      }
      randomizeItems(array, options)
      if (elems.relics.checked) {
        randomizeRelics(array)
      }
      // Recalc edc
      eccEdcCalc(array)
      const url = URL.createObjectURL(new Blob([ data ], { type: 'application/octet-binary' }))
      elems.download.download = randomizedFilename(selectedFile.name, seedValue)
      elems.download.href = url
      elems.download.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      elems.target.className = 'error'
      elems.target.innerHTML = 'Error'
      throw e
    }
  }, false)
  const file = reader.readAsArrayBuffer(selectedFile)
}

const elems = {}

if (isBrowser) {
  const body = document.getElementsByTagName('body')[0]
  body.addEventListener('dragover', dragOverListener, false)
  body.addEventListener('dragleave', dragLeaveListener, false)
  body.addEventListener('drop', dropListener, false)
  elems.target = document.getElementById('target')
  elems.form = document.getElementById('form')
  form.addEventListener('submit', submitListener, false)
  elems.randomize = form.elements['randomize']
  elems.seed = form.elements['seed']
  elems.seed.addEventListener('change', changeHandler, false)
  elems.relics = form.elements['relics']
  elems.startingEquipment = form.elements['starting-equipment']
  elems.equipmentLocations = form.elements['item-locations']
  elems.download = document.getElementById('download')
  elems.loader = document.getElementById('loader')
  resetState()
} else {
  const argv = require('yargs')
    .option('seed', {
      alias: 's',
      describe: 'seed',
      default: (new Date()).getTime().toString(),
    })
    .option('starting-equipment', {
      alias: 'e',
      describe: 'randomize starting equipment',
      type: 'boolean',
      default: true,
    })
    .option('item-locations', {
      alias: 'i',
      describe: 'randomize item locations',
      type: 'boolean',
      default: true,
    })
    .option('relic-locations', {
      alias: 'r',
      describe: 'randomize relic locations',
      type: 'boolean',
      default: true,
    })
    .option('check-vanilla', {
      alias: 'c',
      describe: 'require vanilla .bin file (does not modify image)',
      type: 'boolean',
      default: false,
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
    })
    .demandCommand(1, 'must provide .bin filename to randomize')
    .help()
    .version(false)
    .argv
  const fs = require('fs')
  const path = require('path')
  const util = require('util')
  const randomizeItems = require('./SotN-Item-Randomizer')
  const randomizeRelics = require('./SotN-Relic-Randomizer')
  const eccEdcCalc = require('./ecc-edc-recalc-js')
  const seed = argv.seed.toString()
  if (argv.verbose) {
    console.log('using seed ' + util.inspect(seed))
  }
  require('seedrandom')(seed, {global: true})
  const data = fs.readFileSync(argv._[0])
  let success = true
  randomizeItems(data, argv)
  randomizeRelics(data, argv)
  if (!argv.checkVanilla) {
    eccEdcCalc(data)
    fs.writeFileSync(argv._[0], data)
  }
}
