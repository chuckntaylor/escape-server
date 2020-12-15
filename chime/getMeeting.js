const AWS = require('aws-sdk')
const { v4: uuidv4 } = require('uuid')

// Store created meetings in a map so attendees can join by meeting title
// This would be replaced with a database
const meetingTable = {}

module.exports = async function getMeeting(meetingName, username, mediaRegion) {
  // TODO: - Normally, setting credentials works like this:
  // AWS.config.credentials = new AWS.Credentials(accessKeyId, secretAccessKey, null);

  // create AWS Chime object
  // currently MUST use 'us-east-1' - can select a MediaRegion later
  const chime = new AWS.Chime({ region: 'us-east-1' })
  chime.endpoint = new AWS.Endpoint('https://service.chime.aws.amazon.com')

  // =========== GET A MEETING ================
  const getMeeting = async () => {
    // check data object
    if (meetingTable[meetingName]) {
      const meetingId = meetingTable[meetingName].Meeting.MeetingId

      try {
        const fetchedMeeting = await chime
          .getMeeting({ MeetingId: meetingId }, async (err, data) => {
            if (err) {
              console.error(
                'An error occured while trying to fetch an existing meeting from AWS. Going to try and create a new Meeting instead.',
                err
              )
              return await createNewMeeting()
            }
            // no error
            // return data
          })
          .promise()
        return fetchedMeeting
      } catch (err) {
        // Possible chime.getMeeting errors.
        // BadRequestException - The input parameters don't match the service's restrictions. - HTTP Status Code: 400
        // ForbiddenException - The client is permanently forbidden from making the request. - HTTP Status Code: 403
        // NotFoundException - One or more of the resources in the request does not exist in the system. - HTTP Status Code: 404
        // ServiceFailureException - The service encountered an unexpected error. - HTTP Status Code: 500
        // ServiceUnavailableException - The service is currently unavailable. - HTTP Status Code: 503
        // ThrottledClientException - The client exceeded its request rate limit. - HTTP Status Code: 429
        // UnauthorizedClientException - The client is not currently authorized to make the request. - HTTP Status Code: 401
        console.error('An error occured while trying to fetch an existing meeting from AWS: ', err)
        return await createNewMeeting()
      }
    } else {
      // not in table
      return await createNewMeeting()
    }
  }

  // =========== CREATE A MEETING ================
  const createNewMeeting = async () => {
    // Use a UUID for the client request token to ensure that any request retries
    // do not create multiple meetings.
    // The unique identifier for the client request. Use a different token for different meetings.
    const clientRequestId = uuidv4()

    // assign the resulting meeting object to the meetingTable
    try {
      const newMeeting = await chime
        .createMeeting({
          ClientRequestToken: clientRequestId,
          ExternalMeetingId: meetingName,
          MediaRegion: mediaRegion,
        })
        .promise()
      meetingTable[meetingName] = newMeeting
      return newMeeting
    } catch (err) {
      // FIXME: Put together an error return to the client to initiate a retry.
      // Possible chime.createMeeting errors
      // BadRequestException - The input parameters don't match the service's restrictions. - HTTP Status Code: 400
      // ForbiddenException - The client is permanently forbidden from making the request. - HTTP Status Code: 403
      // ResourceLimitExceededException - The request exceeds the resource limit. - HTTP Status Code: 400
      // ServiceFailureException - The service encountered an unexpected error. - HTTP Status Code: 500
      // ServiceUnavailableException - The service is currently unavailable. - HTTP Status Code: 503
      // ThrottledClientException - The client exceeded its request rate limit. - HTTP Status Code: 429
      // UnauthorizedClientException - The client is not currently authorized to make the request. - HTTP Status Code: 401
      console.error('Error creating a new meeting.', err)
      return null
    }
  }

  // =========== CREATE AN ATTENDEE ================
  const createAttendee = async (meeting) => {
    // **** or string ID you want to associate with the user ****
    // The Amazon Chime SDK external user ID
    // Links the attendee to an identity managed by a builder application.
    // If you create an attendee with the same external user id, the service returns the existing record.

    // FIXME: - combine username and a unique string that can be parsed out on the front-end to ensure unique names alaways.
    const externalUserId = username || uuidv4()
    // const externalUserId = uuidv4()

    try {
      const attendee = await chime
        .createAttendee({
          MeetingId: meeting.Meeting.MeetingId, // pass in the meeting ID received from AWS Chime in previous step
          ExternalUserId: externalUserId,
        })
        .promise()
      return attendee
    } catch (err) {
      // FIXME: Put together an error return to the client to initiate a retry.
      console.error('Error creating attendee :', err)
      return null
    }
  }

  // =============== SEND TO CLIENT ==================

  // Next steps are to securely send the meeting and the attendee objects to the client
  // These objects contain all the information needed for a meeting application using the
  // Amazon Chime SDK for JavaScript to join the meeting.
  const meeting = await getMeeting()
  const attendee = await createAttendee(meeting)

  return {
    meeting,
    attendee,
  }
}
