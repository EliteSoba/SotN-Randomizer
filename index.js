let isBrowser = true

try {
  isBrowser = !module
} catch (e) {}

let info
let downloadReady
let selectedFile

const MAX_VERBOSITY = 5

function newInfo() {
  return Array(MAX_VERBOSITY + 1).fill(null).map(function() {
    return {}
  })
}

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

function seedChangeHandler() {
  disableDownload()
}

function spoilersChangeHandler() {
  if (!elems.showSpoilers.checked) {
    elems.spoilers.style.visibility = 'hidden'
  } else if (elems.spoilers.value.match(/[^\s]/)) {
    elems.spoilers.style.visibility = 'visible'
  }
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
  info = newInfo()
  let seedValue = (new Date()).getTime().toString()
  if (elems.seed.value.length) {
    seedValue = elems.seed.value
  }
  Math.seedrandom(seedValue)
  info[1]['Seed'] = seedValue
  const reader = new FileReader()
  reader.addEventListener('load', function() {
    try {
      const data = reader.result
      const array = new Uint8Array(data)
      const options = {
        relicLocations: elems.relicLocations.checked,
        startingEquipment: elems.startingEquipment.checked,
        itemLocations: elems.itemLocations.checked,
      }
      randomizeItems(array, options, info)
      randomizeRelics(array, options)
      elems.spoilers.value = formatInfo(info, MAX_VERBOSITY)
      if (elems.showSpoilers.checked) {
        elems.spoilers.style.visibility = 'visible'
      }
      // Recalc edc
      eccEdcCalc(array)
      const url = URL.createObjectURL(new Blob([ data ], {
        type: 'application/octet-binary'
      }))
      elems.download.download = randomizedFilename(
        selectedFile.name,
        seedValue,
      )
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

function formatInfo(info, verbosity) {
  const props = []
  for (let level = 0; level <= verbosity; level++) {
    Object.getOwnPropertyNames(info[level]).forEach(function(prop) {
      if (props.indexOf(prop) === -1) {
        props.push(prop)
      }
    })
  }
  const lines = []
  props.forEach(function(prop) {
    for (let level = 0; level <= verbosity; level++) {
      if (info[level][prop]) {
        let text = prop + ':'
        if (Array.isArray(info[level][prop])) {
          text += '\n' + info[level][prop].map(function(item) {
            return '  ' + item
          }).join('\n')
        } else {
          text += ' ' + info[level][prop]
        }
        lines.push(text)
      }
    }
  })
  return lines.join('\n')
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
  elems.seed.addEventListener('change', seedChangeHandler, false)
  elems.relicLocations = form.elements['relic-locations']
  elems.startingEquipment = form.elements['starting-equipment']
  elems.itemLocations = form.elements['item-locations']
  elems.showSpoilers = form.elements['show-spoilers']
  elems.showSpoilers.addEventListener('change', spoilersChangeHandler, false)
  elems.spoilers = document.getElementById('spoilers')
  elems.download = document.getElementById('download')
  elems.loader = document.getElementById('loader')
  resetState()
} else {
  const argv = require('yargs')
    .option('seed', {
      alias: 's',
      describe: 'Seed',
      default: (new Date()).getTime().toString(),
    })
    .option('starting-equipment', {
      alias: 'e',
      describe: 'Randomize starting equipment',
      type: 'boolean',
      default: true,
    })
    .option('item-locations', {
      alias: 'i',
      describe: 'Randomize item locations',
      type: 'boolean',
      default: true,
    })
    .option('relic-locations', {
      alias: 'r',
      describe: 'Randomize relic locations',
      type: 'boolean',
      default: true,
    })
    .option('check-vanilla', {
      alias: 'c',
      describe: 'Require vanilla .bin file (does not modify image)',
      type: 'boolean',
      default: false,
    })
    .option('verbose', {
      alias: 'v',
      describe: 'verbosity level',
      type: 'count',
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
  info = newInfo()
  if (!argv.checkVanilla) {
    const seed = argv.seed.toString()
    info[1]['Seed'] = seed
    require('seedrandom')(seed, {global: true})
  }
  const data = fs.readFileSync(argv._[0])
  randomizeItems(data, argv, info)
  randomizeRelics(data, argv)
  if (argv.verbose >= 1) {
    console.log(formatInfo(info, argv.verbose))
  }
  if (!argv.checkVanilla) {
    eccEdcCalc(data)
    fs.writeFileSync(argv._[0], data)
  }
}
