// ============================================
// Random Forest Classification — Navrongo 2025
// v4 — No NDWI, Balanced Training
// ============================================

// 1. Load Assets
var boundary = ee.FeatureCollection('users/yinelishebayinbemi/Navrongo_Study_Area_UTM');
var training_polygons = ee.FeatureCollection('users/yinelishebayinbemi/Training_Polygons_WGS84');

// 2. Load Sentinel-2 Image
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(boundary)
  .filterDate('2025-03-01', '2025-03-31')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
  .median()
  .clip(boundary);

// 3. Compute Spectral Indices (no NDWI)
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

// 4. Stack Bands + Indices
var image = s2.select(['B2','B3','B4','B8','B11','B12'])
  .addBands(ndvi)
  .addBands(ndbi)
  .addBands(bsi);

var bands = ['B2','B3','B4','B8','B11','B12','NDVI','NDBI','BSI'];

// 5. Balance training samples — 10 per class maximum
var urban = training_polygons.filter(ee.Filter.eq('ClassNum', 1));
var vegetation = training_polygons.filter(ee.Filter.eq('ClassNum', 2));
var bareland = training_polygons.filter(ee.Filter.eq('ClassNum', 3));
var water = training_polygons.filter(ee.Filter.eq('ClassNum', 4));

print('Urban polygons:', urban.size());
print('Vegetation polygons:', vegetation.size());
print('Bare land polygons:', bareland.size());
print('Water polygons:', water.size());

// 6. Sample equal pixels per class
var sampleUrban = image.sampleRegions({
  collection: urban,
  properties: ['ClassNum'],
  scale: 10
}).randomColumn().limit(100);

var sampleVeg = image.sampleRegions({
  collection: vegetation,
  properties: ['ClassNum'],
  scale: 10
}).randomColumn().limit(100);

var sampleBare = image.sampleRegions({
  collection: bareland,
  properties: ['ClassNum'],
  scale: 10
}).randomColumn().limit(100);

var sampleWater = image.sampleRegions({
  collection: water,
  properties: ['ClassNum'],
  scale: 10
}).randomColumn().limit(100);

// 7. Merge balanced training
var training = sampleUrban
  .merge(sampleVeg)
  .merge(sampleBare)
  .merge(sampleWater);

print('Total balanced training size:', training.size());

// 8. Train Random Forest
var classifier = ee.Classifier.smileRandomForest(200)
  .train({
    features: training,
    classProperty: 'ClassNum',
    inputProperties: bands
  });

// 9. Classify
var classified = image.classify(classifier);

// 10. Display
Map.centerObject(boundary, 13);
Map.addLayer(classified, {
  min: 1, max: 4,
  palette: ['grey', 'green', 'yellow', 'blue']
}, 'RF Classification 2025 v4');

Map.addLayer(boundary, {color: 'red'}, 'Study Area');

// 11. Print confirmation
print('Classification complete');

// 12. Export
Export.image.toDrive({
  image: classified,
  description: 'RF_Classification_2025_v4',
  folder: 'GEE_Exports',
  fileNamePrefix: 'RF_Classification_2025_v4',
  region: boundary.geometry(),
  scale: 10,
  crs: 'EPSG:32630',
  maxPixels: 1e13
});
