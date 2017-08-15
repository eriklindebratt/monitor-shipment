#!/usr/bin/env node

const request = require('request')
const { spawn } = require('child_process')
const notifier = require('node-notifier')
const processArgs = require('command-line-args')

const args = processArgs([
  { name: 'shipmentId', alias: 's', type: String },
  { name: 'lang', alias: 'l', type: String, defaultValue: 'en' }
])

const validLanguages = ['en', 'sv']
const checkInterval = 5000
let previousEvent = null

if (!args.shipmentId) {
  console.error('Invalid shipment ID. Please pass one using `--shipmentId=<shipmentId>` or `-s <shipmentId>`')
  process.exit(1)
}

if (!validLanguages.includes(args.lang)) {
  console.error(`Invalid language. Valid ones are ${validLanguages.map(l => JSON.stringify(l)).join(', ')}.`)
  process.exit(1)
}

function notify(event) {
  notifier.notify({
    title: 'New shipment update!',
    message: event.eventDescription
  })

  spawn('say', ['New shipment update!'])
}

function checkForUpdates() {
  console.log('Checking for updates...')

  const url = `http://www.postnord.se/api/shipment/${args.shipmentId}/${args.lang}`

  request.get(url, {json: true}, (err, response, body) => {
    const latestEvent = body.response.trackingInformationResponse.shipments[0].items[0].events[0]

    if (!previousEvent || previousEvent.eventTime !== latestEvent.eventTime) {
      console.log(`Got new event!\n - ${latestEvent.eventDescription}`);
      previousEvent = latestEvent
      notify(latestEvent)
    }
  })
}

checkForUpdates()
setInterval(checkForUpdates, checkInterval)
