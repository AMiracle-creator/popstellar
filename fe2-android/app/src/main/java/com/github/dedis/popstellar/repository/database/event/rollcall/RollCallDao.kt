package com.github.dedis.popstellar.repository.database.event.rollcall

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.github.dedis.popstellar.model.objects.RollCall
import io.reactivex.Completable
import io.reactivex.Single

@Dao
interface RollCallDao {
  @Insert(onConflict = OnConflictStrategy.REPLACE)
  fun insert(rollCallEntity: RollCallEntity): Completable

  /**
   * This function is a query execution to search for rollcalls in a given lao.
   *
   * @param laoId identifier of the lao where to search the rollcalls
   * @return an emitter of a list of rollcalls
   */
  @Query("SELECT rollcall FROM rollcalls WHERE lao_id = :laoId")
  fun getRollCallsByLaoId(laoId: String): Single<List<RollCall>?>
}
