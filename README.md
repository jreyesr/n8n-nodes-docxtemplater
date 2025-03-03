# n8n-nodes-docxtemplater

This is an n8n community node. It lets you use [docxtemplater](https://docxtemplater.com/) in your n8n workflows.

[docxtemplater](https://docxtemplater.com/) is a library that generates DOCX, PPTX and XLSX documents from templates and
a database containing the custom data. This enables you to automate large-scale document generation efficiently.

The docxtemplater tags (e.g. `{ object.data | filter1 | filter2 }`) can
use [Mozjexl](https://github.com/mozilla/mozjexl?tab=readme-ov-file#all-the-details) syntax: binary operators such as +
and -, comparisons such as == or !=, and [transforms](https://github.com/mozilla/mozjexl?tab=readme-ov-file#transforms)
such as `| lower` that work like shell pipes.

This node lets you transform this template document:

![a screenshot of a Word document containing some tags surrounded by curly brackets](imgs/readme_sourcedoc.png)

into this document:

![a screenshot of a PDF document where the tags have been replaced by data](imgs/readme_outputdoc.png)

It also allows you to
use [N8N's Advanced AI Tool nodes](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/), like those that
are used to provide "Tool Calling" functionality on LLMs:

![img.png](img.png)

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Compatibility](#compatibility)  
[Usage](#usage)
[Resources](#resources)  
[Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community
nodes documentation.

## Operations

### Render

This operation receives a DOCX, PPTX or XLSX document (1), plus a "context" (a JSON document) (2), and outputs another
DOCX, PPTX or XLSX document (3). The input document can have "tags" such as `{ value }`, which will be replaced with the
corresponding data in the context.

![a screenshot from the N8N UI showing a Render node, which has a Word document in the input and some JSON data in a text field](imgs/readme_nodeconfig.png)

With the context in the image above, it's possible to write tags like this (and, in
general, [anything else that is supported by the Mozjexl Javascript Expression Language](https://github.com/mozilla/mozjexl)
in the Word document:

* `{ first_name }`: Will simply be replaced by the corresponding JSON field, so the output document will contain `Joe`
* `{ first_name + " " + last_name }`: Will execute a string concatenation, so the output will be `Joe Doe`
* `{ first_name | uppercase }`: Will read the `first_name` property and then call
  a https://github.com/mozilla/mozjexl?tab=readme-ov-file#transforms on it (must be implemented!). This may output `JOE`
* `{ positions["Chief of " in .title] }`: Will [filter the
  `positions` array](https://github.com/mozilla/mozjexl?tab=readme-ov-file#collections) array such that only positions
  that mention "Chief of " are kept

All these can be freely mixed with Docxtemplater syntax, such
as [loops](https://docxtemplater.com/docs/tag-types/#loops)
or [conditionals](https://docxtemplater.com/docs/tag-types/#conditions):

![a Word document with a loop over the letters of a string](imgs/readme_loopfilter.png)

turns into

![a PDF document where the loop has been turned into a set of bullet points](imgs/readme_loopfilter_output.png)

## Compatibility

This node has been developed on N8N v1.80.5. It should work with older versions as long as they
include [Tools for AI nodes](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolcode/).
If you encounter any problems, please [open an issue](https://github.com/jreyesr/n8n-nodes-docxtemplater/issues)!

## Usage

_This is an optional section. Use it to help users with any difficult or confusing aspects of the node._

_By the time users are looking for community nodes, they probably already know n8n basics. But if you expect new users,
you can link to the [Try it out](https://docs.n8n.io/try-it-out/) documentation to help them get started._

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* <https://docxtemplater.com/docs/tag-types/>

## Version history

TODO

