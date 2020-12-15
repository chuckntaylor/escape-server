const path = require('path')
const express = require('express')
const app = express()
const history = require('connect-history-api-fallback')
// const cors = require('cors') // Maybe not needed
const helmet = require('helmet')

const getMeeting = require('./chime/getMeeting.js')

const PORT = 3000

// Attach main middleware
app.use(history())
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
) // Put your helmet on!
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Statically serve up the Vue App build
app.use(express.static(path.join(__dirname, '../app/dist')))

// ============= API ROUTES ==============

// Check if code is correct
app.post('/api/code-check', (req, res) => {
  // a code is submitted along with the game id.
  // check if code is valid
  // check if game is expired
  // check if started - (quit and are getting back with buddies)
  const isValid = req.body.code === '123'
  if (isValid) {
    res.json({
      status: 'SUCCESS',
    })
  } else {
    res.json({
      status: 'ERROR',
    })
  }
})

// Request to join a meeting
app.post('/api', async (req, res, next) => {
  console.log('A new meeting request has been made')
  // would validate the meetingName offered up.
  // but not now 😀
  const meetingName = req.body.meetingName
  const username = req.body.username
  const mediaRegion = req.body.mediaRegion
  // TODO: - Should go in a try catch block
  console.log(
    `Going to call getMeeting() with { meetingName: ${meetingName}, username: ${username}, mediaRegion: ${mediaRegion} }`
  )
  chimeMeetingObject = await getMeeting(meetingName, username, mediaRegion) // execute the logic with AWS Chime
  res.json(chimeMeetingObject)
})

// ============= APP ROUTES ==============
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../app/dist/index.html'))
})

// ============= START ================
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
