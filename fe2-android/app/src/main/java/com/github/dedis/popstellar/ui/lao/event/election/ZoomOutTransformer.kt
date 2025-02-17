package com.github.dedis.popstellar.ui.lao.event.election

import android.view.View
import androidx.viewpager2.widget.ViewPager2
import kotlin.math.abs

/**
 * This is a transformer for a ViewPager2, it allows a zoom on swipe animation
 * https://developer.android.com/training/animation/screen-slide-2#zoom-out
 */
class ZoomOutTransformer : ViewPager2.PageTransformer {
  override fun transformPage(view: View, position: Float) {
    val pageWidth = view.width
    val pageHeight = view.height

    if (position < -1) { // [-Infinity,-1)
      // This page is way off-screen to the left.
      view.alpha = 0f
    } else if (position <= 1) { // [-1,1]
      // Modify the default slide transition to shrink the page as well
      val scaleFactor = MIN_SCALE.coerceAtLeast(1 - abs(position))
      val vertMargin = pageHeight * (1 - scaleFactor) / 2
      val horzMargin = pageWidth * (1 - scaleFactor) / 2
      if (position < 0) {
        view.translationX = horzMargin - vertMargin / 2
      } else {
        view.translationX = -horzMargin + vertMargin / 2
      }

      // Scale the page down (between MIN_SCALE and 1)
      view.scaleX = scaleFactor
      view.scaleY = scaleFactor

      // Fade the page relative to its size.
      view.alpha = MIN_ALPHA + (scaleFactor - MIN_SCALE) / (1 - MIN_SCALE) * (1 - MIN_ALPHA)
    } else { // (1,+Infinity]
      // This page is way off-screen to the right.
      view.alpha = 0f
    }
  }

  companion object {
    private const val MIN_SCALE = 0.85f
    private const val MIN_ALPHA = 0.5f
  }
}
