import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [resolve("dist/mcp.js")],
  stderr: "pipe",
});
const client = new Client({ name: "nycdata-live-check", version: "1.0.0" });

try {
  await client.connect(transport);
  const tools = await client.listTools();
  const search = await client.callTool({
    name: "search_datasets",
    arguments: { query: "restaurant inspections", limit: 1 },
  });
  const describe = await client.callTool({
    name: "describe_dataset",
    arguments: { datasetId: "43nn-pn8j" },
  });
  const query = await client.callTool({
    name: "query_dataset",
    arguments: {
      datasetId: "43nn-pn8j",
      select: "camis,dba,boro,grade",
      where: "boro = 'Brooklyn'",
      limit: 2,
    },
  });
  const profile = await client.callTool({
    name: "profile_dataset",
    arguments: { datasetId: "43nn-pn8j", sampleSize: 10 },
  });

  process.stdout.write(
    `${JSON.stringify(
      {
        tools: tools.tools.map((tool) => tool.name),
        searchOk: !search.isError,
        describeOk: !describe.isError,
        queryOk: !query.isError,
        profileOk: !profile.isError,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await client.close();
}
