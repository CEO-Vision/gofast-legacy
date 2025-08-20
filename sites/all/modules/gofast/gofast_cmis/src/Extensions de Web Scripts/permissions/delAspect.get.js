var aspectName = args.aspectName;
var skipCount = 0;
var maxCount = 100000;
var successfulNodes = [];
var errorNodes = [];
var query = 'ASPECT:"' + aspectName + '"';
var page = {
  skipCount: parseInt(skipCount),
  maxItems: parseInt(maxCount)
};

var searchQuery = {
  query: query,
  language: "fts-alfresco",
  page: page
};

logger.log("Search Query: " + query);
logger.log("Skip count: " + skipCount);
logger.log("Max count: " + maxCount);

try {
  var nodes = search.query(searchQuery);
  logger.log("Resulted nodes count: " + nodes.length);

  for each (var node in nodes) {
    if (node.hasAspect(aspectName)) {
        node.removeAspect(aspectName);
      successfulNodes.push(node);
    } else {
      errorNodes.push(node);
    }
  }

  logger.log("Successful nodes count: " + successfulNodes.length);
  logger.log("Error nodes count: " + errorNodes.length);

} catch (e) {
  logger.log("Error during search: " + e.message);
}

model.myStatus = "Aspect was removed!";
