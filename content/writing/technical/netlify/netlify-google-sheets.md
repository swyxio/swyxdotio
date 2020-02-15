---
title: Google Sheets v4 API with Netlify Dev
description: wiring up Google Sheets via a Netlify Function
slug: netlify-google-sheets
categories: ['Tech', 'Netlify']
date: 2020-02-14
---

Google Sheets' API is very hard to use. I've tried and failed a few times. I finally figured it out today. Its worth it mainly because free usage is way cheaper than Airtable, but accordingly its docs absolutely fucking suck. 

anyway I figured it out. i'm tired so i cant write as nicely as I normally do but here are my notes.

## [Demo Here](https://github.com/sw-yx/netlify-google-spreadsheet-demo/)

For live demo check https://netlify-google-spreadsheet-demo.netlify.com/

![googlesheets](https://user-images.githubusercontent.com/6764957/74577961-ecb51800-4f5f-11ea-9b81-30a5fcb6e68c.gif)

## How to get the env vars: an incomplete tutorial

1. make a google sheet. its id from url will be `GOOGLE_SPREADSHEET_ID_FROM_URL`

2. head to google console and make sure the Sheets API is enabled https://console.developers.google.com/apis/library/sheets.googleapis.com?project=sixth-storm-268221. you may need to set up a "project" for this if this is your first time.

![image](https://user-images.githubusercontent.com/6764957/74578095-9eecdf80-4f60-11ea-85b2-d75641292015.png)

3. get the service account key, NOT the API key. this might help: https://github.com/theoephraim/node-google-spreadsheet/blob/756d57fea3e1cf1d5ba6a38b12210102da0bf621/docs/getting-started/authentication.md. this will give you `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` (see form below)

![image](https://user-images.githubusercontent.com/6764957/74578194-1f134500-4f61-11ea-9f4b-d85d6e6e6d46.png)


4. Make sure your sheet has granted permission https://stackoverflow.com/questions/38949318/google-sheets-api-returns-the-caller-does-not-have-permission-when-using-serve to `GOOGLE_SERVICE_ACCOUNT_EMAIL`

## to set this up for local dev

make sure to set env vars inside `functions/google-spreadsheet-fn/.env`:

```bash
TRY_TO=CUSTOMIZE_THIS
GOOGLE_SPREADSHEET_ID_FROM_URL= # e.g. 10abcu_reo5FctMpuiOYHJstj3lTit4pvp-VS7mZhgVw
GOOGLE_SERVICE_ACCOUNT_EMAIL= # e.g. googlenetlify-spreadsheet-test@foo-bar-123456.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY= # e.g. -----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG etc etc super long key
```

and then with the Netlify CLI you can run `ntl dev` ([Netlify Dev](https://github.com/netlify/cli/blob/master/docs/netlify-dev.md)) and it opens up locally for you to develop.

## to set this up on your own in production on netlify

make sure to set the env vars in the netlify UI

## Getting to CRUD

I have commented through the netlify function accordingly (source in [github](https://github.com/sw-yx/netlify-google-spreadsheet-demo/blob/master/functions/google-spreadsheet-fn/google-spreadsheet-fn.js)):

```js
/*
 * prerequisites
 */
if (!process.env.NETLIFY) {
  // get local env vars if not in CI
  // if in CI i expect its already set via the Netlify UI
  require('dotenv').config();
}
// required env vars
if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL)
  throw new Error('no GOOGLE_SERVICE_ACCOUNT_EMAIL env var set');
if (!process.env.GOOGLE_PRIVATE_KEY)
  throw new Error('no GOOGLE_PRIVATE_KEY env var set');
if (!process.env.GOOGLE_SPREADSHEET_ID_FROM_URL)
  // spreadsheet key is the long id in the sheets URL
  throw new Error('no GOOGLE_SPREADSHEET_ID_FROM_URL env var set');

/*
 * ok real work
 *
 * GET /.netlify/functions/google-spreadsheet-fn
 * GET /.netlify/functions/google-spreadsheet-fn/1
 * PUT /.netlify/functions/google-spreadsheet-fn/1
 * POST /.netlify/functions/google-spreadsheet-fn
 * DELETE /.netlify/functions/google-spreadsheet-fn/1
 *
 * the library also allows working just with cells,
 * but this example only shows CRUD on rows since thats more common
 */
const { GoogleSpreadsheet } = require('google-spreadsheet');

exports.handler = async (event, context) => {
  const UserIP = event.headers['x-nf-client-connection-ip'] || '6.9.6.9'; // not required, i just feel like using this info
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID_FROM_URL);

  // https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
  });
  await doc.loadInfo(); // loads document properties and worksheets. required.
  const sheet = doc.sheetsByIndex[0]; // you may want to customize this if you have more than 1 sheet
  // console.log('accessing', sheet.title, 'it has ', sheet.rowCount, ' rows');
  const path = event.path.replace(/\.netlify\/functions\/[^/]+/, '');
  const segments = path.split('/').filter((e) => e);

  try {
    switch (event.httpMethod) {
      case 'GET':
        /* GET /.netlify/functions/google-spreadsheet-fn */
        if (segments.length === 0) {
          const rows = await sheet.getRows(); // can pass in { limit, offset }
          const serializedRows = rows.map(serializeRow);
          return {
            statusCode: 200,
            // body: JSON.stringify(rows) // dont do this - has circular references
            body: JSON.stringify(serializedRows) // better
          };
        }
        /* GET /.netlify/functions/google-spreadsheet-fn/123456 */
        if (segments.length === 1) {
          const rowId = segments[0];
          const rows = await sheet.getRows(); // can pass in { limit, offset }
          const srow = serializeRow(rows[rowId]);
          return {
            statusCode: 200,
            body: JSON.stringify(srow) // just sends less data over the wire
          };
        } else {
          throw new Error(
            'too many segments in GET request - you should only call somehting like /.netlify/functions/google-spreadsheet-fn/123456 not /.netlify/functions/google-spreadsheet-fn/123456/789/101112'
          );
        }
      /* POST /.netlify/functions/google-spreadsheet-fn */
      case 'POST':
        /* parse the string body into a useable JS object */
        const data = JSON.parse(event.body);
        data.UserIP = UserIP;
        // console.log('`POST` invoked', data);
        const addedRow = await sheet.addRow(data);
        // console.log({ addedRow });
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: `POST Success - added row ${addedRow._rowNumber - 1}`,
            rowNumber: addedRow._rowNumber - 1 // minus the header row
          })
        };
      /* PUT /.netlify/functions/google-spreadsheet-fn/123456 */
      case 'PUT':
        /* PUT /.netlify/functions/google-spreadsheet-fn */
        if (segments.length === 0) {
          console.error('PUT request must also have an id'); // we could allow mass-updating of the sheet, but nah
          return {
            statusCode: 422, // unprocessable entity https://stackoverflow.com/questions/3050518/what-http-status-response-code-should-i-use-if-the-request-is-missing-a-required
            body: 'PUT request must also have an id.'
          };
        }
        /* PUT /.netlify/functions/google-spreadsheet-fn/123456 */
        if (segments.length === 1) {
          const rowId = segments[0];
          const rows = await sheet.getRows(); // can pass in { limit, offset }
          const data = JSON.parse(event.body);
          data.UserIP = UserIP;
          console.log(`PUT invoked on row ${rowId}`, data);
          const selectedRow = rows[rowId];
          Object.entries(data).forEach(([k, v]) => {
            selectedRow[k] = v;
          });
          await selectedRow.save(); // save updates
          return {
            statusCode: 200,
            body: JSON.stringify({ message: 'PUT is a success!' })
            // body: JSON.stringify(rows[rowId]) // just sends less data over the wire
          };
        } else {
          return {
            statusCode: 500,
            body:
              'too many segments in PUT request - you should only call somehting like /.netlify/functions/google-spreadsheet-fn/123456 not /.netlify/functions/google-spreadsheet-fn/123456/789/101112'
          };
        }
      /* DELETE /.netlify/functions/google-spreadsheet-fn/123456 */
      case 'DELETE':
        //
        // warning:
        // this code is untested but you can probably figure this out
        //

        if (segments.length === 1) {
          const rows = await sheet.getRows(); // can pass in { limit, offset }
          // // we dont actually use this in the demo but you might
          // const rowId = segments[0];
          // await rows[rowId].delete(); // delete a row

          // do this
          if (rows.length > 1) {
            const lastRow = rows[rows.length - 1];
            await lastRow.delete(); // delete a row
            return {
              statusCode: 200,
              body: JSON.stringify({ message: 'DELETE is a success!' })
            };
          } else {
            return {
              statusCode: 200,
              body: JSON.stringify({
                message: 'no rows left to delete! (first row is sacred)'
              })
            };
          }
        } else {
          return {
            statusCode: 500,
            body: JSON.stringify({
              message:
                'invalid segments in DELETE request, must be /.netlify/functions/google-spreadsheet-fn/123456'
            })
          };
        }
      /* Fallthrough case */
      default:
        return {
          statusCode: 500,
          body: 'unrecognized HTTP Method, must be one of GET/POST/PUT/DELETE'
        };
    }
  } catch (err) {
    console.error('error ocurred in processing ', event);
    console.error(err);
    return {
      statusCode: 500,
      body: err.toString()
    };
  }

  /*
   * utils
   */
  function serializeRow(row) {
    let temp = {};
    sheet.headerValues.map((header) => {
      temp[header] = row[header];
    });
    return temp;
  }
};
```


## Other resources

- You may find writing Google Apps Scripts easier. But it is "intel inside".
- here is prior art but i think it is v3. https://github.com/grod220/CCS-B.B.Warfield/blob/master/lambda/googleSheets.js

