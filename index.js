#!/usr/bin/env node

const request = require('request')
const { spawn } = require('child_process')
const notifier = require('node-notifier')
const processArgs = require('command-line-args')

const args = processArgs([
  { name: 'apiKey', alias: 'k', type: String },
  { name: 'shipmentId', alias: 's', type: String },
  { name: 'lang', alias: 'l', type: String, defaultValue: 'en' }
])

const validLanguages = ['en', 'sv']
const checkInterval = 300000
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
    title: `New shipment update! (${args.shipmentId})`,
    message: event.eventDescription
  })

  spawn('say', ['New shipment update!'])
}

function checkForUpdates() {
  console.log('Checking for updates...')

  const url = `https://api2.postnord.com/rest/shipment/v1/trackandtrace/findByIdentifier.json?id=${args.shipmentId}&locale=${args.lang}&apikey=${args.apiKey}`

  request.get(url, {json: true}, (err, response, body) => {
    if (err) {
      throw err
    }

    if (
      !(body && typeof(body) === 'object') ||
      !(body.TrackingInformationResponse && typeof(body.TrackingInformationResponse) === 'object') ||
      !(body.TrackingInformationResponse.shipments && body.TrackingInformationResponse.shipments instanceof Array) ||
      !(body.TrackingInformationResponse.shipments[0] && typeof(body.TrackingInformationResponse.shipments[0]) === 'object') ||
      !(body.TrackingInformationResponse.shipments[0].items && body.TrackingInformationResponse.shipments[0].items instanceof Array) ||
      !(body.TrackingInformationResponse.shipments[0].items[0] && typeof(body.TrackingInformationResponse.shipments[0].items[0]) === 'object') ||
      !(body.TrackingInformationResponse.shipments[0].items[0].events && body.TrackingInformationResponse.shipments[0].items[0].events instanceof Array)
    ) {
      console.error('Unexpected API response:\n${body}\n\n')
      return
    }

    const events = body.TrackingInformationResponse.shipments[0].items[0].events
    const latestEvent = events[events.length-1]

    if (!previousEvent || previousEvent.eventTime !== latestEvent.eventTime) {
      console.log(`Got new event!\n - ${latestEvent.eventDescription}`)
      previousEvent = latestEvent
      notify(latestEvent)
    }
  })
}

checkForUpdates()
setInterval(checkForUpdates, checkInterval)
