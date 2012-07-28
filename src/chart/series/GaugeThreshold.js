/**
 * @class Ext.ux.chart.series.GaugeThreshold
 * @author Pavel Podlipensky (pavel@podlipensky.com)
 * 
 * Usage example:
 * 
 */
Ext.define('Ext.ux.chart.series.GaugeThreshold', {

    extend: 'Ext.chart.series.Gauge',
    type: "gaugethreshold",
    alias: 'series.gaugethreshold',

    //todo: calculate thresholds on the fly based on min/max
    thresholds: [
        {
            maxValue: 30,
            color: '#82B525' // min-30 green
        },
        {
            maxValue: 60,
            color: '#4885C3' // 30-60 blue
        },
        {
            maxValue: 100,
            color: '#E73F3F' // 60 - 100 red
        }
    ],
    // background color of the gauge
    bgColor: '#DFDFDF',

    // foreground color of number value (if showValue = true)
    fontColor: '#82B525',

    // shows exact value as a number on a chart
    showValue: true,

    // place number-value to 
    // 'c' - the center of the gauge (useful in case of donut type gauge) or
    // 'tl' - top-left corner of the chart or
    // 'tr' - top-right corner of the chart
    alignValue: 'c',

    drawSeries: function () {
        var me = this,
            chart = me.chart,
            store = chart.getChartStore(),
            group = me.group,
            animate = me.chart.animate,
            axis = me.chart.axes.get(0),
            minimum = axis && axis.minimum || me.minimum || 0,
            maximum = axis && axis.maximum || me.maximum || 0,
            field = me.angleField || me.field || me.xField,
            surface = chart.surface,
            chartBBox = chart.chartBBox,
            rad = me.rad,
            donut = +me.donut,
            values = {},
            items = [],
            seriesStyle = me.seriesStyle,
            seriesLabelStyle = me.seriesLabelStyle,
        //colorArrayStyle = me.colorArrayStyle,
        //colorArrayLength = colorArrayStyle && colorArrayStyle.length || 0,
            gutterX = chart.maxGutter[0],
            gutterY = chart.maxGutter[1],
            cos = Math.cos,
            sin = Math.sin,
            rendererAttributes, centerX, centerY, slice, slices, sprite, value,
            item, ln, record, i, j, startAngle, endAngle, middleAngle, sliceLength, path,
            p, spriteOptions, bbox, splitAngle, sliceA, sliceB;

        Ext.apply(seriesStyle, me.style || {});

        me.setBBox();
        bbox = me.bbox;

        //override theme colors
        //todo: grab colors from theme
        //        if (me.colorSet) {
        //            colorArrayStyle = me.colorSet;
        //            colorArrayLength = colorArrayStyle.length;
        //        }

        //if not store or store is empty then there's nothing to draw
        if (!store || !store.getCount() || me.seriesIsHidden) {
            me.hide();
            me.items = [];
            return;
        }

        centerX = me.centerX = chartBBox.x + (chartBBox.width / 2);
        centerY = me.centerY = chartBBox.y + chartBBox.height;
        me.radius = Math.min(centerX - chartBBox.x, centerY - chartBBox.y);
        me.slices = slices = [];
        me.items = items = [];

        if (!me.value) {
            record = store.getAt(0);
            me.value = record.get(field);
        }

        value = me.value;
        if (me.needle) {
            sliceA = {
                series: me,
                value: value,
                startAngle: -180,
                endAngle: 0,
                rho: me.radius
            };
            splitAngle = -180 * (1 - (value - minimum) / (maximum - minimum));
            slices.push(sliceA);
        } else {
            splitAngle = -180 * (1 - (value - minimum) / (maximum - minimum));
            sliceA = {
                series: me,
                value: value,
                startAngle: -180,
                endAngle: splitAngle,
                rho: me.radius
            };
            sliceB = {
                series: me,
                value: me.maximum - value,
                startAngle: splitAngle,
                endAngle: 0,
                rho: me.radius
            };
            slices.push(sliceA, sliceB);
        }

        //do pie slices after.
        for (i = 0, ln = slices.length; i < ln; i++) {
            slice = slices[i];
            sprite = group.getAt(i);
            //set pie slice properties
            rendererAttributes = Ext.apply({
                segment: {
                    startAngle: slice.startAngle,
                    endAngle: slice.endAngle,
                    margin: 0,
                    rho: slice.rho,
                    startRho: slice.rho * +donut / 100,
                    endRho: slice.rho
                }
            }, Ext.apply(seriesStyle, { fill: (i == ln - 1 ? me.bgColor : me.getColorByValue(value))} || {}));

            item = Ext.apply({},
                rendererAttributes.segment, {
                    slice: slice,
                    series: me,
                    storeItem: record,
                    index: i
                });
            items[i] = item;
            // Create a new sprite if needed (no height)
            if (!sprite) {
                spriteOptions = Ext.apply({
                    type: "path",
                    group: group
                }, Ext.apply(seriesStyle, { fill: (i == ln - 1 ? me.bgColor : me.getColorByValue(value))} || {}));
                sprite = surface.add(Ext.apply(spriteOptions, rendererAttributes));
            }
            slice.sprite = slice.sprite || [];
            item.sprite = sprite;
            slice.sprite.push(sprite);
            if (animate) {
                rendererAttributes = me.renderer(sprite, record, rendererAttributes, i, store);
                sprite._to = rendererAttributes;
                me.onAnimate(sprite, {
                    to: rendererAttributes
                });
            } else {
                rendererAttributes = me.renderer(sprite, record, Ext.apply(rendererAttributes, {
                    hidden: false
                }), i, store);
                sprite.setAttributes(rendererAttributes, true);
            }
        }

        if (me.needle) {
            splitAngle = splitAngle * Math.PI / 180;

            if (!me.needleSprite) {
                me.needleSprite = me.chart.surface.add({
                    type: 'path',
                    path: ['M', centerX + (me.radius * +donut / 100) * cos(splitAngle),
                        centerY + -Math.abs((me.radius * +donut / 100) * sin(splitAngle)),
                        'L', centerX + me.radius * cos(splitAngle),
                        centerY + -Math.abs(me.radius * sin(splitAngle))],
                    'stroke-width': 4,
                    'stroke': '#222'
                });
            } else {
                if (animate) {
                    me.onAnimate(me.needleSprite, {
                        to: {
                            path: ['M', centerX + (me.radius * +donut / 100) * cos(splitAngle),
                                centerY + -Math.abs((me.radius * +donut / 100) * sin(splitAngle)),
                                'L', centerX + me.radius * cos(splitAngle),
                                centerY + -Math.abs(me.radius * sin(splitAngle))]
                        }
                    });
                } else {
                    me.needleSprite.setAttributes({
                        type: 'path',
                        path: ['M', centerX + (me.radius * +donut / 100) * cos(splitAngle),
                            centerY + -Math.abs((me.radius * +donut / 100) * sin(splitAngle)),
                            'L', centerX + me.radius * cos(splitAngle),
                            centerY + -Math.abs(me.radius * sin(splitAngle))]
                    });
                }
            }
            me.needleSprite.setAttributes({
                hidden: false
            }, true);
        }
        console.log('draw number value');
        if (me.showValue) {
            value = 123.434;
            if (!me.numberSprite) {
                spriteOptions = Ext.apply({
                    type: "text",
                    zIndex: 100,
                    series: me
                }, Ext.apply(seriesStyle, { fill: me.fontColor }));
                me.numberSprite = me.chart.surface.add(spriteOptions);
            }
            //if this is a first-time calculation or chart was resized or text was changed - update font size
            if (me.numberSprite.radius != me.radius || me.numberSprite.attr.text != value) {
                fontSize = this.getFontSizeByValue(value, me.radius * +donut / 100, me.radius);
                me.numberSprite.setAttributes({
                    hidden: false,
                    font: fontSize.size + 'px Arial',
                    text: value,
                    x: centerX,
                    y: centerY - fontSize.height / 2,
                    'text-anchor': 'middle',
                    value: value
                }, true);
                me.numberSprite.radius = me.radius;
            }
        }

        delete me.value;
    },

    getFontSizeByValue: function (value, innerR, r) {
        var i, el, size,
            minSize = 12,
            maxSize = 72,
            w, h, cosA, isBigger,
            maxFound = false;
        if (!this.measureEl) {
            this.measureEl = Ext.create('Ext.Component', {
                style: {
                    fontFamily: 'Arial',
                    position: 'absolute',
                    left: -10000,
                    top: -10000
                },
                renderTo: Ext.getBody()
            });
        }
        el = this.measureEl.getEl();
        //get the middle of sizes
        i = minSize + Math.floor((maxSize - minSize) / 2);
        // perform binary search for the maximum font size
        while (!maxFound) {
            console.log(i, minSize, maxSize);
            el.setStyle('font-size', i + 'px');
            size = Ext.util.TextMetrics.measure(el, value);
            //calculate maxH based on estimated width
            w = size.width / 2;
            cosA = w / innerR;
            h = Math.sqrt(1 - cosA * cosA) * innerR;
            isBigger = (size.width > innerR * 2) || (size.height > h);
            if (isBigger) {
                maxSize = i;
            }
            else {
                minSize = i;
            }
            i = minSize + Math.floor((maxSize - minSize) / 2);
            maxFound = (maxSize - minSize) <= 1;            
        }
        if (size) {
            return {
                height: size.height,
                width: size.width,
                size: i
            };
        }
    },

    getColorByValue: function (value) {
        var me = this,
            thresholds = me.thresholds,
            len = thresholds.length,
            i;
        for (i = 0; i < len; i++) {
            if (value <= thresholds[i].maxValue) {
                return thresholds[i].color;
            }
        }
    },

    /**
    * Returns a string with the color to be used for the series legend item.
    */
    getLegendColor: function (index) {
        var me = this, fill, stroke;
        if (me.seriesStyle) {
            fill = me.seriesStyle.fill;
            stroke = me.seriesStyle.stroke;
            if (fill && fill != 'none') {
                return fill;
            }
            if (stroke) {
                return stroke;
            }
        }
        return (me.colorArrayStyle) ? me.colorArrayStyle[me.seriesIdx % me.colorArrayStyle.length] : '#000';
    }

});