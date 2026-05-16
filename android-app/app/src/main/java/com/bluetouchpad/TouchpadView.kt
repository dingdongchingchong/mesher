package com.bluetouchpad

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.View

/**
 * Custom view that acts as a touchpad surface.
 * Handles single-finger move, two-finger scroll, tap-to-click,
 * double-tap, and long-press for drag.
 */
class TouchpadView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    var onMove: ((dx: Float, dy: Float) -> Unit)? = null
    var onTap: (() -> Unit)? = null
    var onDoubleTap: (() -> Unit)? = null
    var onTwoFingerTap: (() -> Unit)? = null
    var onScroll: ((amount: Float) -> Unit)? = null
    var onDragStart: (() -> Unit)? = null
    var onDragEnd: (() -> Unit)? = null

    private var lastX = 0f
    private var lastY = 0f
    private var lastTwoFingerY = 0f
    private var touchStartX = 0f
    private var touchStartY = 0f
    private var touchStartTime = 0L
    private var lastTapTime = 0L
    private var isDragging = false
    private var isScrolling = false
    private var pointerCount = 0
    private var hasMoved = false

    private val sensitivity = 1.8f
    private val scrollSensitivity = 2.0f
    private val tapThreshold = 15f
    private val tapTimeThreshold = 250L
    private val doubleTapTimeThreshold = 350L
    private val longPressThreshold = 400L

    private var longPressRunnable: Runnable? = null

    private val dotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(60, 255, 255, 255)
        style = Paint.Style.FILL
    }

    private val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(40, 255, 255, 255)
        style = Paint.Style.STROKE
        strokeWidth = 2f
    }

    private val touchIndicatorPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(30, 100, 180, 255)
        style = Paint.Style.FILL
    }

    private var currentTouchX = -1f
    private var currentTouchY = -1f
    private var showTouchIndicator = false

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        val rect = RectF(4f, 4f, width - 4f, height - 4f)
        canvas.drawRoundRect(rect, 24f, 24f, borderPaint)

        val gridSpacing = 40f
        var x = gridSpacing
        while (x < width) {
            var y = gridSpacing
            while (y < height) {
                canvas.drawCircle(x, y, 1.5f, dotPaint)
                y += gridSpacing
            }
            x += gridSpacing
        }

        if (showTouchIndicator && currentTouchX >= 0) {
            canvas.drawCircle(currentTouchX, currentTouchY, 40f, touchIndicatorPaint)
        }
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        pointerCount = event.pointerCount

        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                lastX = event.x
                lastY = event.y
                touchStartX = event.x
                touchStartY = event.y
                touchStartTime = System.currentTimeMillis()
                hasMoved = false
                isScrolling = false

                currentTouchX = event.x
                currentTouchY = event.y
                showTouchIndicator = true
                invalidate()

                longPressRunnable = Runnable {
                    if (!hasMoved && !isScrolling) {
                        isDragging = true
                        onDragStart?.invoke()
                        performHapticFeedback(android.view.HapticFeedbackConstants.LONG_PRESS)
                    }
                }
                handler?.postDelayed(longPressRunnable!!, longPressThreshold)
            }

            MotionEvent.ACTION_POINTER_DOWN -> {
                if (event.pointerCount == 2) {
                    isScrolling = true
                    lastTwoFingerY = (event.getY(0) + event.getY(1)) / 2f
                    handler?.removeCallbacks(longPressRunnable!!)
                }
            }

            MotionEvent.ACTION_MOVE -> {
                if (event.pointerCount == 2 && isScrolling) {
                    val currentTwoFingerY = (event.getY(0) + event.getY(1)) / 2f
                    val scrollDy = (lastTwoFingerY - currentTwoFingerY) * scrollSensitivity
                    if (kotlin.math.abs(scrollDy) > 1f) {
                        onScroll?.invoke(scrollDy)
                        lastTwoFingerY = currentTwoFingerY
                    }
                } else if (event.pointerCount == 1) {
                    val dx = (event.x - lastX) * sensitivity
                    val dy = (event.y - lastY) * sensitivity

                    val totalDx = event.x - touchStartX
                    val totalDy = event.y - touchStartY
                    if (kotlin.math.abs(totalDx) > tapThreshold || kotlin.math.abs(totalDy) > tapThreshold) {
                        hasMoved = true
                    }

                    if (hasMoved) {
                        onMove?.invoke(dx, dy)
                    }

                    lastX = event.x
                    lastY = event.y

                    currentTouchX = event.x
                    currentTouchY = event.y
                    invalidate()
                }
            }

            MotionEvent.ACTION_POINTER_UP -> {
                if (isScrolling && !hasMoved) {
                    val elapsed = System.currentTimeMillis() - touchStartTime
                    if (elapsed < tapTimeThreshold) {
                        onTwoFingerTap?.invoke()
                    }
                }
            }

            MotionEvent.ACTION_UP -> {
                handler?.removeCallbacks(longPressRunnable!!)

                showTouchIndicator = false
                invalidate()

                if (isDragging) {
                    isDragging = false
                    onDragEnd?.invoke()
                    return true
                }

                if (!hasMoved && !isScrolling) {
                    val elapsed = System.currentTimeMillis() - touchStartTime
                    if (elapsed < tapTimeThreshold) {
                        val now = System.currentTimeMillis()
                        if (now - lastTapTime < doubleTapTimeThreshold) {
                            onDoubleTap?.invoke()
                            lastTapTime = 0L
                        } else {
                            lastTapTime = now
                            postDelayed({
                                if (System.currentTimeMillis() - lastTapTime >= doubleTapTimeThreshold - 50) {
                                    onTap?.invoke()
                                }
                            }, doubleTapTimeThreshold)
                        }
                    }
                }

                isScrolling = false
                hasMoved = false
            }

            MotionEvent.ACTION_CANCEL -> {
                handler?.removeCallbacks(longPressRunnable!!)
                showTouchIndicator = false
                if (isDragging) {
                    isDragging = false
                    onDragEnd?.invoke()
                }
                isScrolling = false
                hasMoved = false
                invalidate()
            }
        }
        return true
    }
}
