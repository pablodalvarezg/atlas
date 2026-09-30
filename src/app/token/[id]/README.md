There is deliberately no `loading.tsx` here.

A `loading.tsx` starts the stream before the page body runs, and Next must commit
to `200 OK` to send that first chunk. `notFound()` firing afterwards cannot change
the status — it injects `<meta name="robots" content="noindex">` instead, which is
documented in `node_modules/next/dist/docs/01-app/02-guides/streaming.md`
under "The HTTP contract".

The result was that `/token/anything-at-all` answered `200 OK`. On a catalogue
whose job is to be found, a wrong status on every bogus URL costs more than the
skeleton bought, and the skeleton only ever showed for tokens the build had not
prerendered.
