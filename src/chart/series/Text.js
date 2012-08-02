/**
 * @class Ext.ux.chart.series.Text
 * @author Pavel Podlipensky (pavel@podlipensky.com)
 * 
 * Usage example:
 * 
 */
Ext.define('Ext.ux.chart.series.Text', {
    /* Begin Definitions */

    extend: 'Ext.chart.series.Series',

    /* End Definitions */

    type: 'text',
    alias: 'series.text',

    valueFormat: '{0} Days',

    showTrend: true,
    trendFormat: '{0}%',

    //make it null in order to use theme colors
    colors: {
        value: '#444',
        trend: '#666',
        trendIconUp: '#82B525',
        trendIconDown: '#E73F3F'
    },

    constructor: function (config) {
        this.callParent(arguments);
        var me = this;
    },

    /**
    * Draws the series for the current chart.
    */
    drawSeries: function () {
        var me = this,
            chart = me.chart,
            chartSize = chart.getSize(),
            store = chart.getChartStore(),
            group = me.group,
            animate = me.chart.animate,
            axis = me.chart.axes.get(0),
            minimum = axis && axis.minimum || me.minimum || 0,
            maximum = axis && axis.maximum || me.maximum || 0,
            field = me.field || me.xField,
            descField = me.descField,
            surface = chart.surface,
            chartBBox = chart.chartBBox,
            rad = me.rad,
            donut = +me.donut,
            values = { },
            items = [],
            seriesStyle = me.seriesStyle,
            seriesLabelStyle = me.seriesLabelStyle,
            colorArrayStyle = me.colorArrayStyle,
            colorArrayLength = colorArrayStyle && colorArrayStyle.length || 0,
            colors = me.colors || { },
            gutterX = chart.maxGutter[0],
            gutterY = chart.maxGutter[1],
            cos = Math.cos,
            sin = Math.sin,
            rendererAttributes, centerX, centerY, slice, slices, sprite,
            value, desc, text,
            item, ln, record, i, j, startAngle, endAngle, middleAngle, sliceLength, path,
            p, spriteOptions, bbox, splitAngle, sliceA, sliceB, pos,
            valueHeight, valueY, fontSize,
            trendY, trendX, trendIconWidth, trendDiff = 0, trendText, trendHeight, trendFontSize;

        centerX = me.centerX = chartBBox.x + (chartBBox.width / 2);
        centerY = me.centerY = chartBBox.y + chartBBox.height;

        if (!me.value) {
            record = store.getAt(0);
            me.value = record.get(field);
        }

        if (!me.desc) {
            record = store.getAt(0);
            me.desc = record.get(descField);
        }

        value = me.value;
        desc = me.desc;

        Ext.apply(seriesStyle, me.style || {});

        if (me.colorSet) {
            colorArrayStyle = me.colorSet;
            colorArrayLength = colorArrayStyle.length;
        }
        me.lastValue = 31;
        text = me.valueFormat ? Ext.String.format(me.valueFormat, value) : value;

        if (!me.valueSprite) {
            if (!colors.value) {
                colors.value = colorArrayStyle[0];
            }
            spriteOptions = Ext.apply({
                type: "text",
                series: me
            }, Ext.apply(seriesStyle, { fill: colors.value }));
            me.valueSprite = me.chart.surface.add(spriteOptions);
        }
        if (me.showTrend && !me.trendSprite) {
            if (!colors.trend) {
                colors.trend = colorArrayStyle[1];
            }
            spriteOptions = Ext.apply({
                type: "text",
                series: me
            }, Ext.apply(seriesStyle, { fill: colors.trend }));
            me.trendSprite = me.chart.surface.add(spriteOptions);
            //todo: draw triangle-indicator
        }
        if (me.showTrend && !me.trendIconSprite) {
            if (!colors.trendIconUp && !colors.trendIconDown) {
                colors.trendIconUp = colorArrayStyle[2];
                colors.trendIconDown = colorArrayStyle[3];
            }
            spriteOptions = Ext.apply({
                type: "path",
                series: me
            }, Ext.apply(seriesStyle));
            me.trendIconSprite = me.chart.surface.add(spriteOptions);
            //todo: draw triangle-indicator
        }
        //if this is a first-time calculation or chart was resized or text was changed - update font size
        if (me.valueSprite.attr.text != text || me.valueSprite.width != chartBBox.width || me.valueSprite.height != chartBBox.height) {
            //main text height depends on absence
            valueHeight = chartBBox.height * 2 / 3;
            fontSize = this.getFontSizeByValue(text, valueHeight);
            me.valueSprite.setAttributes({
                hidden: false,
                font: fontSize.size + 'px Arial',
                text: text,
                value: value
            }, true);
            // show trend data if allowed
            if (me.showTrend) {
                //show trend data if any
                if (me.lastValue !== undefined) {
                    trendDiff = value - me.lastValue;
                    trendText = Ext.String.format(me.trendFormat, trendDiff);
                    //use chartSize instead of chartBBox because of incorrect height calc
                    //make sure that trend font size is not bigger than main font size. Use proportion here?
                    trendHeight = Math.min(chartSize.height - fontSize.height - 10 - chartBBox.y * 2, fontSize.height - 10);
                    //console.log(chartSize.height, fontSize.height, chartBBox.y);
                    trendFontSize = this.getFontSizeByValue(trendText, trendHeight);
                    me.trendSprite.setAttributes({
                        hidden: false,
                        font: trendFontSize.size + 'px Arial',
                        text: trendText,
                        value: trendDiff
                    }, true);
                    //cache font and size
                    me.trendSprite.fontSize = trendFontSize;
                    me.trendSprite.height = trendHeight;
                    me.trendSprite.width = chartBBox.width;
                } else { //there is no trend data yet - hide trends
                    me.lastValue = value;
                    //hide trend
                    me.trendSprite.setAttributes({
                        hidden: true
                    });
                }
            }
            //cache font and size
            me.valueSprite.fontSize = fontSize;
            me.valueSprite.width = chartBBox.width;
            me.valueSprite.height = valueHeight;
        }
        trendIconWidth = 20; //todo: calculate it
        valueY = chartBBox.y + me.valueSprite.fontSize.height / 2;
        trendY = valueY + 10 + me.trendSprite.fontSize.height;
        trendX = chartBBox.x + trendIconWidth * 1.5;
        // position value and trend sprites
        if (!me.showTrend) {
            // do nothing - do we want to keep text on the top or center when no trends?            
        } else {
            //if (me.lastValue != value) {
                me.trendSprite.setAttributes({
                    x: trendX,
                    y: trendY
                }, true);
                me.trendIconSprite.setAttributes({
                    path: me.getTrendIconPath(trendIconWidth, trendDiff > 0 ? 'up' : 'down', chartBBox.x + trendIconWidth / 2, trendY),
                    fill: trendDiff > 0 ? colors.trendIconUp : colors.trendIconDown
                }, true);
            //}
        }
        // do we want to keep text on the top or center when no trends?
        me.valueSprite.setAttributes({
            x: chartBBox.x,
            y: valueY
        }, true);
    },
        
    getTrendIconPath: function (width, direction, x, y) {
        var height = width;
        if (direction == 'up') {
            return [
                ["M", x - width / 2, y + height / 2],
                ["L", x, y - height / 2],
                ["L", x + width / 2, y + height / 2],
                ["L", x - width / 2, y + height / 2]
            ];
        }
        //direction - down
        return [
            ["M", x - width / 2, y - height / 2],
            ["L", x + width / 2, y - height / 2],
            ["L", x, y + height / 2],
            ["L", x - width / 2, y - height / 2]
        ];
    },

    getFontSizeByValue: function (value, height) {
        var me = this,
            chart = me.chart,
            bbox = chart.chartBBox,
            i, el, size,
            minSize = 12,
            maxSize = 172,
            isBigger,
            maxFound = false;
        if (!me.measureEl) {
            me.measureEl = Ext.create('Ext.Component', {
                style: {
                    fontFamily: 'Arial',
                    position: 'absolute',
                    left: -10000,
                    top: -10000
                },
                renderTo: Ext.getBody()
            });
        }
        //there are could be other elements on the chart, so share space with them
        if (height) {
            bbox.height = height;
        }
        el = me.measureEl.getEl();
        //get the middle of sizes
        i = minSize + Math.floor((maxSize - minSize) / 2);
        // perform binary search for the maximum font size
        while (!maxFound) {
            el.setStyle('font-size', i + 'px');
            size = Ext.util.TextMetrics.measure(el, value);
            isBigger = size.width > bbox.width || size.height > bbox.height;
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

    /**
    * Sets the Gauge chart to the current specified value.
    */
    setValue: function (value) {
        this.value = value;
        this.drawSeries();
    }

});