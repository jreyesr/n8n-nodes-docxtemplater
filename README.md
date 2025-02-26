![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n-nodes-starter

This repo contains example nodes to help you get started building your own custom integrations for [n8n](n8n.io). It includes the node linter and other dependencies.

To make your custom node available to the community, you must create it as an npm package, and [submit it to the npm registry](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry).


## Using this starter

These are the basic steps for working with the starter. For detailed guidance on creating and publishing nodes, refer to the [documentation](https://docs.n8n.io/integrations/creating-nodes/).

4. Open the project in your editor.
5. Browse the examples in `/nodes` and `/credentials`. Modify the examples, or replace them with your own nodes.
6. Update the `package.json` to match your details.
7. Run `pnpm lint` to check for errors or `pnpm lintfix` to automatically fix errors when possible.
8. Test your node locally. Refer to [Run your node locally](https://docs.n8n.io/integrations/creating-nodes/test/run-node-locally/) for guidance.
9. Replace this README with documentation for your node. Use the [README_TEMPLATE](README_TEMPLATE.md) to get started.
10. Update the LICENSE file to use your details.
11. [Publish](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry) your package to npm.

## More information

Refer to our [documentation on creating nodes](https://docs.n8n.io/integrations/creating-nodes/) for detailed information on building your own nodes.

## License

[MIT](https://github.com/n8n-io/n8n-nodes-starter/blob/master/LICENSE.md)
