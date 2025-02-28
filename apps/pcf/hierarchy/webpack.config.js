// @ts-check

const { composePlugins, withNx } = require("@nx/webpack");
const { withReact } = require("@nx/react");
const { withRescoBasic } = require("../../../tools/common/webpack.with.resco.basic");
const { withHtmlLoader } = require("../../../tools/common/webpack.with.htmlloader");
const { withPcf } = require("../../../tools/pcf/webpack.with.pcf");

module.exports = composePlugins(withNx(), withReact(), withRescoBasic(), withHtmlLoader(), withPcf());
