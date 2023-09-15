import { Application, Router } from "https://deno.land/x/oak@v12.6.0/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import * as importedFuncs from "./funcs.ts"

type FunctionInvocation = {
  functionName: string,
  args: unknown[],
}

type FuncsMap = {
  [functionName: string]: (...args: any) => any
}

const router = new Router();
router
  .post("/", async (context) => {
    const jsonBody = context.request.body()
    const invocation: FunctionInvocation = await jsonBody.value;
    
    const funcs = importedFuncs as FuncsMap;

    let retval = funcs[invocation.functionName](...invocation.args);

    try {
      if (typeof retval === "object" && 'then' in retval && typeof retval.then === "function") {
        retval = await retval;
      }
      
      context.response.type = "application/json";
      context.response.body = JSON.stringify(retval);
    } catch(e) {
      context.response.type = "application/json";
      context.response.status = 500;
      context.response.body = {type: 'error', message: e.message, stack: e.stack};
    }
  });

const app = new Application();
app.use(oakCors()); // Enable CORS for All Routes
app.use(router.routes());
app.use(router.allowedMethods());

console.log("listening on http://localhost:8000/");
await app.listen({ port: 8000 });