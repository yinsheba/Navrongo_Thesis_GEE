// ============================================
// RF Classification — Navrongo 2025
// Full Feature Set: Bands + Indices + Auxiliary
// Based on Shandu et al. (2025) methodology
// ============================================

// 1. Load Assets
var boundary = ee.FeatureCollection('users/yinelishebayinbemi/Navrongo_Study_Area_UTM');
var training_polygons = ee.FeatureCollection('users/yinelishebayinbemi/Training_Polygons_WGS84');
var roads = ee.FeatureCollection('users/yinelishebayinbemi/Navrongo_roads_WGS84');

// 2. Load Sentinel-2 Image
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(boundary)
  .filterDate('2025-03-01', '2025-03-31')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
  .median()
  .clip(boundary);

// 3. Spectral Indices
var ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI');
var ndbi = s2.normalizedDifference(['B11', 'B8']).rename('NDBI');
var bsi = s2.expression(
  '((B11 + B4) - (B8 + B2)) / ((B11 + B4) + (B8 + B2))',
  {
    'B11': s2.select('B11'),
    'B4': s2.select('B4'),
    'B8': s2.select('B8'),
    'B2': s2.select('B2')
  }).rename('BSI');
var ndmi = s2.normalizedDifference(['B8', 'B11']).rename('NDMI');
var evi = s2.expression(
  '2.5 * ((B8 - B4) / (B8 + 6 * B4 - 7.5 * B2 + 1))',
  {
    'B8': s2.select('B8'),
    'B4': s2.select('B4'),
    'B2': s2.select('B2')
  }).rename('EVI');

// 4. Auxiliary Data

// DEM — elevation and slope
var dem = ee.Image('USGS/SRTMGL1_003').clip(boundary);
var elevation = dem.select('elevation').rename('Elevation');
var slope = ee.Terrain.slope(dem).rename('Slope');

// GHSL Built-up layer — most important predictor per Shandu et al. 2025
var ghsl = ee.ImageCollection('JRC/GHSL/P2023A/GHS_BUILT_S')
  .filter(ee.Filter.date('2020-01-01', '2021-01-01'))
  .first()
  .select(0)
  .clip(boundary)
  .rename('GHSL');

// Distance to roads — corrected
var roadsRaster = ee.Image().paint(roads, 1)
  .fastDistanceTransform(256)
  .sqrt()
  .multiply(ee.Image.pixelArea().sqrt())
  .clip(boundary)
  .rename('DistRoads');

// Distance to water — corrected
var water = ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
  .select('occurrence')
  .gt(50)
  .clip(boundary);

var waterVector = water.reduceToVectors({
  geometry: boundary,
  scale: 30,
  maxPixels: 1e10
});

var distWater = ee.Image().paint(waterVector, 1)
  .fastDistanceTransform(256)
  .sqrt()
  .multiply(ee.Image.pixelArea().sqrt())
  .clip(boundary)
  .rename('DistWater');

// 5. Stack All Features
var image = s2.select(['B2','B3','B4','B8','B11','B12'])
  .addBands(ndvi)
  .addBands(ndbi)
  .addBands(bsi)
  .addBands(ndmi)
  .addBands(evi)
  .addBands(elevation)
  .addBands(slope)
  .addBands(ghsl)
  .addBands(roadsRaster)
  .addBands(distWater);

var bands = [
  'B2','B3','B4','B8','B11','B12',
  'NDVI','NDBI','BSI','NDMI','EVI',
  'Elevation','Slope','GHSL','DistRoads','DistWater'
];

// 6. Sample Training Data
var training = image.sampleRegions({
  collection: training_polygons,
  properties: ['ClassNum'],
  scale: 10
});

print('Training size:', training.size());

// 7. Train RF — Best parameters from Shandu et al. 2025 Model 3
var classifier = ee.Classifier.smileRandomForest({
  numberOfTrees: 150,
  variablesPerSplit: 4,
  minLeafPopulation: 1,
  bagFraction: 0.6,
  maxNodes: 500,
  seed: 7
}).train({
  features: training,
  classProperty: 'ClassNum',
  inputProperties: bands
});

// 8. Classify
var classified = image.classify(classifier);

// 9. Display
Map.centerObject(boundary, 13);
Map.addLayer(classified, {
  min: 1, max: 4,
  palette: ['grey', 'green', 'yellow', 'blue']
}, 'RF Full Features 2025');

Map.addLayer(boundary, {color: 'red'}, 'Study Area');

// 10. Print confirmation
print('Classification complete');

// 11. Export
Export.image.toDrive({
  image: classified,
  description: 'RF_Classification_FullFeatures',
  folder: 'GEE_Exports',
  fileNamePrefix: 'RF_Classification_FullFeatures',
  region: boundary.geometry(),
  scale: 10,
  crs: 'EPSG:32630',
  maxPixels: 1e13
});
