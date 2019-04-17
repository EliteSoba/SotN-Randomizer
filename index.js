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
    elems.showRelics.checked = false
    elems.showRelics.disabled = true
  } else {
    showSpoilers()
    elems.showRelics.disabled = false
  }
}

function showRelicsChangeHandler() {
  showSpoilers()
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

function randomizedFilename(filename, seed) {
  const lastPeriodIdx = filename.lastIndexOf('.')
  const insertIdx = lastPeriodIdx === -1 ? filename.length : lastPeriodIdx
  return [
    filename.slice(0, insertIdx),
    ' (' + seed + ')',
    filename.slice(insertIdx),
  ].join('')
}

function submitListener(event) {
  event.preventDefault()
  event.stopPropagation()
  disableDownload()
  showLoader()
  info = newInfo()
  let seed = (new Date()).getTime().toString()
  if (elems.seed.value.length) {
    seed = elems.seed.value
  }
  Math.seedrandom(seed)
  info[1]['Seed'] = seed
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
      randomizeRelics(array, options, info)
      showSpoilers()
      setSeedText(array, seed)
      // Recalc edc
      eccEdcCalc(array)
      const url = URL.createObjectURL(new Blob([ data ], {
        type: 'application/octet-binary'
      }))
      elems.download.download = randomizedFilename(
        selectedFile.name,
        seed,
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
  hideLoader()
  const file = reader.readAsArrayBuffer(selectedFile)
}

function formatInfo(info, verbosity) {
  if (!info) {
    return ''
  }
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

function showSpoilers() {
  let verbosity = 2
  if (elems.showRelics.checked) {
    verbosity++
  }
  elems.spoilers.value = formatInfo(info, verbosity)
  if (elems.showSpoilers.checked && elems.spoilers.value.match(/[^\s]/)) {
    elems.spoilers.style.visibility = 'visible'
  }
}

function setSeedText(data, seed) {
  const map = {
    ',': 0x8143,
    '.': 0x8144,
    ':': 0x8146,
    ';': 0x8147,
    '?': 0x8148,
    '!': 0x8149,
    '`': 0x814d,
    '"': 0x814e,
    '^': 0x814f,
    '_': 0x8151,
    '~': 0x8160,
    '\'': 0x8166,
    '(': 0x8169,
    ')': 0x816a,
    '[': 0x816d,
    ']': 0x816e,
    '{': 0x816f,
    '}': 0x8170,
    '+': 0x817b,
    '-': 0x817c,
    '0': 0x824f,
    '1': 0x8250,
    '2': 0x8251,
    '3': 0x8252,
    '4': 0x8253,
    '5': 0x8254,
    '6': 0x8255,
    '7': 0x8256,
    '8': 0x8257,
    '9': 0x8258,
  }
  const addresses = [{
    start: 0x04389bf8,
    length: 31,
  }, {
    start: 0x04389c6c,
    length: 52,
  }]
  const maxSeedLength = 31
  addresses.forEach(function(address) {
    let a = 0
    let s = 0
    while (a < address.length) {
      if (a < maxSeedLength && s < seed.length) {
        if (seed[s] in map) {
          if ((a + 1) < maxSeedLength) {
            const short = map[seed[s++]]
            data[address.start + a++] = short >>> 8
            data[address.start + a++] = short & 0xff
          } else {
            s = seed.length
          }
        } else {
          data[address.start + a++] = seed.charCodeAt(s++)
        }
      } else {
        data[address.start + a++] = 0
      }
    }
  })
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
  elems.showRelics = form.elements['show-relics']
  elems.showRelics.addEventListener('change', showRelicsChangeHandler, false)
  elems.spoilers = document.getElementById('spoilers')
  elems.download = document.getElementById('download')
  elems.loader = document.getElementById('loader')
  resetState()
} else {
  const yargs = require('yargs')
        .strict()
    .option('seed', {
      alias: 's',
      describe: 'Seed',
      default: (new Date()).getTime().toString(),
    })
    .option('randomize', {
      alias: 'r',
      describe: [
        'Specify randomizations:',
        '"e" for starting equipment',
        '"i" for item locations',
        '"r" for relic locations',
      ].join('\n'),
      default: 'eir',
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
    .demandCommand(1, 'Must provide .bin filename to randomize')
    .help()
    .version(false)
  const argv = yargs.argv
  for (let i = 0; i < argv.randomize.length; i++) {
    switch (argv.randomize[i]) {
    case 'e':
      argv.startingEquipment = true
      break
    case 'i':
      argv.itemLocations = true
      break
    case 'r':
      argv.relicLocations = true
      break
    default:
      yargs.showHelp()
      console.error('\nInvalid randomization: ' + argv.randomize[i])
      process.exit(1)
    }
  }
  const fs = require('fs')
  const path = require('path')
  const util = require('util')
  const randomizeItems = require('./SotN-Item-Randomizer')
  const randomizeRelics = require('./SotN-Relic-Randomizer')
  const eccEdcCalc = require('./ecc-edc-recalc-js')
  info = newInfo()
  const seed = argv.seed.toString()
  if (!argv.checkVanilla) {
    require('seedrandom')(seed, {global: true})
    info[1]['Seed'] = seed
  }
  const data = fs.readFileSync(argv._[0])
  let returnVal = true
  returnVal = randomizeItems(data, argv, info) && returnVal
  returnVal = randomizeRelics(data, argv, info) && returnVal
  if (argv.verbose >= 1) {
    const text = formatInfo(info, argv.verbose)
    if (text.length) {
      console.log(text)
    }
  }
  if (argv.checkVanilla) {
    process.exit(returnVal ? 0 : 1)
  }
  setSeedText(data, seed)
  eccEdcCalc(data)
  fs.writeFileSync(argv._[0], data)
}
