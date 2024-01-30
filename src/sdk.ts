// This pins the fastify version (transitively used by the ndc-sdk-typescript)
// because 4.26.0 introduces a deno-incompatible change
import fastify from "npm:fastify@4.25.2"
// Have this dependency defined in one place
export * as sdk from 'npm:@hasura/ndc-sdk-typescript@1.2.8';
