'use strict';

define([
	'Constants',
	'ModelInstance',
	'Scene',
	'jquery'
],
function (Constants, ModelInstance, Scene)
{
    //
    // UI states
    // 
    // base -- user is just hovering around, mouse is up. A grid location or existing element will be highlighted.
    // insertLine -- user clicked the mouse down with no modifier key, starting from a grid location.
    // dragPoint -- user clicked the mouse down with a modifier key, starting from an existing wall endpoint.
    //

    function bound(value, lowerBoundInclusive, upperBoundExclusive)
    {
        if (value < lowerBoundInclusive) return lowerBoundInclusive;
        else if (value >= upperBoundExclusive) return upperBoundExclusive - 1;
        return value;
    }

    function Point(x, y)
    {
        this.x = x;
        this.y = y;
    }

    function PointToPointDistSq(p0, p1)
    {
        return (p1.x - p0.x) * (p1.x - p0.x) + (p1.y - p0.y) * (p1.y - p0.y);
    }

    function PointToPointDist(p0, p1)
    {
        return Math.sqrt((p1.x - p0.x) * (p1.x - p0.x) + (p1.y - p0.y) * (p1.y - p0.y));
    }

    function PointsEqual(p0, p1)
    {
        if (p0 == null || p1 == null) return false;
        return (p0.x == p1.x && p0.y == p1.y);
    }

    function Wall(p0, p1)
    {
        this.p0 = p0;
        this.p1 = p1;

        var p0Order = p0.x * 1000 + p0.y;
        var p1Order = p1.x * 1000 + p1.y;
        if (p0Order > p1Order)
        {
            var temp = this.p1;
            this.p1 = this.p0;
            this.p0 = temp;
        }
    }

    function WallToPointDist(wall, point)
    {
        var l2 = PointToPointDistSq(wall.p0, wall.p1);
        if (l2 == 0) return PointToPointDist(point, wall.p0);
        var t = ((point.x - wall.p0.x) * (wall.p1.x - wall.p0.x) + (point.y - wall.p0.y) * (wall.p1.y - wall.p0.y)) / l2;
        if (t < 0) return PointToPointDist(point, wall.p0);
        if (t > 1) return PointToPointDist(point, wall.p1);
        return PointToPointDist(point, new Point(wall.p0.x + t * (wall.p1.x - wall.p0.x), wall.p0.y + t * (wall.p1.y - wall.p0.y)));
    }

    function ArchitectureGenerator(app)
    {
        this.app = app;
        var dialogDivString =
        '<div id="archGenDialog">' +
            '<canvas id="archGenCanvas" oncontextmenu="return false;" tabindex="-1" onclick="$(\'#archGenCanvas\').focus();"></canvas>' +
        '</div>';
        this.$dialog = $(dialogDivString)
        .dialog({
            autoOpen: false,
            modal: true,
            resizable: false,
            width: 800,
            height: 500,
            draggable: false,
            position: ['left', 'top'],
            title: 'I am Dialog'
        });

        this.canvas = id('archGenCanvas');
        this.context = this.canvas.getContext('2d');
        this.canvas.addEventListener('mousemove', this.MouseMove.bind(this), false);
        this.canvas.addEventListener('mousedown', this.MouseDown.bind(this), false);
        this.canvas.addEventListener('mouseup', this.MouseUp.bind(this), false);
        this.canvas.addEventListener('keydown', this.KeyDown.bind(this), false);

        preventSelection(this.canvas);

        this.uiState = 'base';
        this.walls = new Array();

        this.hoverGridPoint = null;
        this.newWallStartPoint = null;
        this.newWallEndPoint = null;
        this.dragPoint = null;

        this.hoverWall = null;

        this.lineSpacing = 24;
    }

    ArchitectureGenerator.prototype.UpdateCanvasSize = function ()
    {
        this.lineCountX = Math.floor(this.canvas.clientWidth / this.lineSpacing);
        this.lineCountY = Math.floor(this.canvas.clientHeight / this.lineSpacing);

        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
    }

    ArchitectureGenerator.prototype.DrawCircle = function (point, radius, fillColor)
    {
        if (point == null) return;
        var context = this.context;
        context.beginPath();
        context.arc(point.x * this.lineSpacing, point.y * this.lineSpacing, radius, 0, 2 * Math.PI, false);
        context.fillStyle = fillColor;
        context.fill();
        context.lineWidth = 1.5;
        context.strokeStyle = "black";
        context.stroke();
    }

    ArchitectureGenerator.prototype.DrawLine = function (p0, p1, lineWidth, lineColor)
    {
        if (p0 == null || p1 == null) return;
        var context = this.context;
        context.beginPath();
        context.moveTo(p0.x * this.lineSpacing, p0.y * this.lineSpacing);
        context.lineTo(p1.x * this.lineSpacing, p1.y * this.lineSpacing);
        context.lineWidth = lineWidth;
        context.strokeStyle = lineColor;
        context.stroke();
    }

    ArchitectureGenerator.prototype.RenderCanvas = function ()
    {
        var context = this.context;

        context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.DrawGrid();

        var self = this;
        this.walls.forEach(
		    function (wall)
		    {
		        if (self.uiState == 'base' && wall == self.hoverWall)
		        {
		            self.DrawLine(wall.p0, wall.p1, 4, "#8ED6FF");
		        }
		        else if (self.uiState == 'insertLine' && wall == self.hoverWall && PointsEqual(self.newWallStartPoint, self.newWallEndPoint))
		        {
		            self.DrawLine(wall.p0, wall.p1, 5, "#FF8ED6");
		        }
		        else
		        {
		            self.DrawLine(wall.p0, wall.p1, 3, "#000000");
		        }
		        self.DrawCircle(wall.p0, 8, "#FFFFFF");
		        self.DrawCircle(wall.p1, 8, "#FFFFFF");
		    }
	    );

        if (this.uiState == 'base')
        {
            this.DrawCircle(this.hoverGridPoint, 6, "#8ED6FF");
        }
        else if (this.uiState == 'insertLine')
        {
            this.DrawLine(this.newWallStartPoint, this.newWallEndPoint, 3, "#000000");
            this.DrawCircle(this.newWallStartPoint, 8, "#FF8ED6");
            this.DrawCircle(this.newWallEndPoint, 8, "#FF8ED6");
        }
        else if (this.uiState = 'dragPoint')
        {
            this.DrawCircle(this.dragPoint, 9.5, "#8EFFD6");
        }
    }

    ArchitectureGenerator.prototype.FindNearestGridPoint = function (mouseArgs)
    {
        return new Point(bound(Math.floor(mouseArgs.offsetX / this.lineSpacing + 0.5), 1, this.lineCountX),
                         bound(Math.floor(mouseArgs.offsetY / this.lineSpacing + 0.5), 1, this.lineCountY));
    }

    ArchitectureGenerator.prototype.FindNearestWall = function (mouseArgs)
    {
        var self = this;
        var closestWallDist = 0.4;
        var closestWall = null;
        var point = new Point(mouseArgs.offsetX / this.lineSpacing, mouseArgs.offsetY / this.lineSpacing);
        this.walls.forEach(
		    function (wall)
		    {
		        var dist = WallToPointDist(wall, point);
		        if (dist < closestWallDist)
		        {
		            closestWallDist = dist;
		            closestWall = wall;
		        }
		    }
	    );
        return closestWall;
    }

    ArchitectureGenerator.prototype.WallIsValid = function (p0, p1)
    {
        if (p0 == null || p1 == null) return false;
        if (p0.x == p1.x && p0.y == p1.y) return false;

        var pWall = new Wall(p0, p1);

        var duplicateFound = false;
        this.walls.forEach(
		    function (wall)
		    {
		        if (PointsEqual(wall.p0, pWall.p0) && PointsEqual(wall.p1, pWall.p1))
		        {
		            duplicateFound = true;
		        }
		    }
	    );
        if (duplicateFound) return false;

        return true;
    }

    ArchitectureGenerator.prototype.RebuildWalls = function ()
    {
        var self = this;
        var oldWalls = this.walls;
        this.walls = new Array();
        oldWalls.forEach(
		    function (wall)
		    {
		        if (self.WallIsValid(wall.p0, wall.p1))
		        {
		            self.walls.push(wall);
		        }
		    }
	    );
    }

    ArchitectureGenerator.prototype.KeyDown = function (keyArgs)
    {
        if ((keyArgs.keyCode == 173 || keyArgs.keyCode == 46) && this.uiState == 'base' && this.hoverWall != null)
        {
            this.walls.splice(this.walls.indexOf(this.hoverWall), 1);
            this.hoverWall = null;
        }
        this.RenderCanvas();
    }

    ArchitectureGenerator.prototype.MouseMove = function (mouseArgs)
    {
        if (this.uiState == 'base')
        {
            this.hoverGridPoint = this.FindNearestGridPoint(mouseArgs);
            this.hoverWall = this.FindNearestWall(mouseArgs);
        }
        else if (this.uiState == 'insertLine')
        {
            this.newWallEndPoint = this.FindNearestGridPoint(mouseArgs);
        }
        else if (this.uiState == 'dragPoint')
        {
            var newDragPoint = this.FindNearestGridPoint(mouseArgs);
            if (!PointsEqual(newDragPoint, this.dragPoint))
            {
                var self = this;
                this.walls.forEach(
		            function (wall)
		            {
		                if (PointsEqual(wall.p0, self.dragPoint)) wall.p0 = newDragPoint;
		                if (PointsEqual(wall.p1, self.dragPoint)) wall.p1 = newDragPoint;
		            }
	            );
                this.RebuildWalls();
                this.dragPoint = newDragPoint;
            }
        }
        this.RenderCanvas();
    }

    ArchitectureGenerator.prototype.MouseDown = function (mouseArgs)
    {
        if (mouseArgs.which == 2 || mouseArgs.which == 3 || mouseArgs.shiftKey || mouseArgs.ctrlKey)
        {
            if (this.uiState == 'base' && this.hoverGridPoint != null)
            {
                var wallWithPointFound = false;
                var self = this;
                this.walls.forEach(
		            function (wall)
		            {
		                if (PointsEqual(wall.p0, self.hoverGridPoint) || PointsEqual(wall.p1, self.hoverGridPoint))
		                {
		                    wallWithPointFound = true;
		                }
		            }
	            );
                if (wallWithPointFound)
                {
                    this.uiState = 'dragPoint';
                    this.dragPoint = this.hoverGridPoint;
                }
            }
        }
        else if (mouseArgs.which == 1)
        {
            if (this.uiState == 'base' && this.hoverGridPoint != null)
            {
                this.uiState = 'insertLine';
                this.newWallStartPoint = this.hoverGridPoint;
                this.newWallEndPoint = this.newWallStartPoint;
            }
        }
        this.RenderCanvas();
    }

    ArchitectureGenerator.prototype.MouseUp = function (mouseArgs)
    {
        if (this.WallIsValid(this.newWallStartPoint, this.newWallEndPoint))
        {
            this.walls.push(new Wall(this.newWallStartPoint, this.newWallEndPoint));
        }

        this.hoverGridPoint = null;
        this.hoverWall = null;
        this.newWallStartPoint = null;
        this.newWallEndPoint = null;
        this.dragPoint = null;
        this.uiState = 'base';
        this.RenderCanvas();
    }

    ArchitectureGenerator.prototype.DrawGrid = function ()
    {
        var width = this.lineCountX * this.lineSpacing;
        var height = this.lineCountY * this.lineSpacing;
        var context = this.context;

        for (var lineIndex = 1; lineIndex < this.lineCountX; lineIndex++)
        {
            context.beginPath();
            context.moveTo(lineIndex * this.lineSpacing, 0);
            context.lineTo(lineIndex * this.lineSpacing, height);
            context.lineWidth = 1;
            context.strokeStyle = "#303030";
            context.stroke();
        }

        for (var lineIndex = 1; lineIndex < this.lineCountY; lineIndex++)
        {
            context.beginPath();
            context.moveTo(0, lineIndex * this.lineSpacing);
            context.lineTo(width, lineIndex * this.lineSpacing);
            context.lineWidth = 1;
            context.strokeStyle = "#303030";
            context.stroke();
        }
    }

    ArchitectureGenerator.prototype.openDialog = function ()
    {
        this.$dialog.dialog('open');
        this.UpdateCanvasSize();
        this.RenderCanvas();
    };

    ArchitectureGenerator.prototype.closeDialog = function ()
    {
        this.$dialog.dialog('close');
    };

    ArchitectureGenerator.prototype.Test = function ()
    {
        $.ajax
	({
	    type: 'POST',
	    url: 'http://' + window.location.host + window.globalViewData.base_url + '/architectureGenerator/generate',
	    contentType: "charset=utf-8",
	    //data:
	    //{
	    //'q': this.encodeText("l 0 3\nl 5 3\nl 5 0\nl 9 0\nl 10 1\nl 10 4\nl 3 4\nl 3 7\nl 0 7"),
	    //    'q': "l 0 3\nl 5 3\nl 5 0\nl 9 0\nl 10 1\nl 10 4\nl 3 4\nl 3 7\nl 0 7",
	    //},
	    data: "fedcba9876543210\nl 0 3\nl 5 3\nl 5 0\nl 9 0\nl 10 1\nl 10 4\nl 3 4\nl 3 7\nl 0 7",
	    success: this.TestSucceeded.bind(this),
	    error: this.TestFailed.bind(this),
	    timeout: 5000
	});
    };


    ArchitectureGenerator.prototype.encodeText = function (text)
    {
        //
        // This function is just in case we need to do certain replacements.
        //
        text = encodeURIComponent(text);
        //text = text.replace(/%20/g, '-');
        //text = text.replace(/%0A/g, '--');
        //text = text.replace('%25', '-');
        return text;
    };

    ArchitectureGenerator.prototype.TestSucceeded = function (data, textStatus, jqXHR)
    {
        console.log("Test succeeded: " + data);
    };

    ArchitectureGenerator.prototype.TestFailed = function (jqXHR, textStatus, errorThrown)
    {
        console.log("Test failed: " + textStatus + ' ' + errorThrown);
    };

    // Exports
    return ArchitectureGenerator;

});
